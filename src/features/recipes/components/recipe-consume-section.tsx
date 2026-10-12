import { useMemo, useState } from "react";
import type { UndoRecipeConsumptionResult } from "#/features/inventory/application/inventory-adjustment-repository";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import type { InventoryListItem } from "#/features/inventory/application/inventory-query-repository";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import {
	type RecipeConsumptionEntryResult,
	type RecipeConsumptionOperation,
	startRecipeConsumption,
} from "../application/consume-recipe-ingredients";
import { loadLinkedShoppingSections } from "../application/load-linked-shopping-sections";
import type { RecipeDetail } from "../application/recipe-repository";
import { resolveIngredientLinks } from "../domain/link-ingredient-needs";
import {
	planRecipeConsumption,
	type RecipeConsumptionRow,
} from "../domain/plan-recipe-consumption";
import {
	flattenRecipeIngredients,
	type RecipeShoppingNeed,
} from "../domain/plan-shopping-from-recipe";
import type { RecipeEditorIngredientNode } from "../domain/recipe-editor-document";
import type { RecipeLinkView } from "../domain/recipe-links";
import * as styles from "./recipe-shopping-section.css";

type RecipeConsumeSectionProps = {
	recipePublicId: string;
	ingredients: readonly RecipeEditorIngredientNode[];
	linkViews?: readonly RecipeLinkView[];
	loadLinkedRecipe?: (publicId: string) => Promise<RecipeDetail | null>;
	ownerScope: InventoryPurchaseOwnerScope | null;
	loadInventoryItems: () => Promise<InventoryListItem[]>;
	// 操作の行を、在庫から引く（onlyNeedIds があれば、その行だけ）。
	consume: (
		operation: RecipeConsumptionOperation,
		onlyNeedIds?: ReadonlySet<string>,
	) => Promise<RecipeConsumptionEntryResult[]>;
	undo: (sourceId: string) => Promise<UndoRecipeConsumptionResult>;
};

type Outcome = {
	rows: RecipeConsumptionRow[];
	operation: RecipeConsumptionOperation;
	failedNeedIds: ReadonlySet<string>;
	isUndone: boolean;
};

const noLinkViews: readonly RecipeLinkView[] = [];

function describeRow(row: RecipeConsumptionRow, isFailed: boolean): string {
	const unit = row.target?.stockUnitLabel ?? "";
	const name = row.need.name;

	if (isFailed) {
		return `${name}：引けませんでした`;
	}

	switch (row.status) {
		case "consume":
			return `${name}：${formatQuantity(row.deduct ?? 0)}${unit}を引きました${row.viaStandIn && row.target ? `（${row.target.name}から）` : ""}`;
		case "partial":
			return `${name}：在庫が足りず、${formatQuantity(row.deduct ?? 0)}${unit}だけ引きました（必要な量は${formatQuantity(row.required ?? 0)}${unit}）`;
		case "unmeasurable":
			return `${name}：量が決まっていない（または換算できない）ため、減らしていません`;
		case "no-stock":
			return `${name}：在庫にないため、引いていません`;
	}
}

// 「作った」を押すと、在庫から使った分を、すぐに引く。あとから「元に戻す」で、引く前に戻せる。
export function RecipeConsumeSection({
	recipePublicId,
	ingredients,
	linkViews = noLinkViews,
	loadLinkedRecipe,
	ownerScope,
	loadInventoryItems,
	consume,
	undo,
}: RecipeConsumeSectionProps) {
	const [isWorking, setIsWorking] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [outcome, setOutcome] = useState<Outcome | null>(null);

	const resolvedNeeds = useMemo(
		() =>
			resolveIngredientLinks(flattenRecipeIngredients(ingredients), linkViews),
		[ingredients, linkViews],
	);

	if (!ownerScope || ownerScope === "guest" || resolvedNeeds.length === 0) {
		return null;
	}

	async function loadNeeds(): Promise<RecipeShoppingNeed[]> {
		const own = resolvedNeeds.filter((need) => !need.linkedRecipe);

		if (!loadLinkedRecipe || !resolvedNeeds.some((need) => need.linkedRecipe)) {
			return own;
		}

		const linked = await loadLinkedShoppingSections(
			resolvedNeeds,
			loadLinkedRecipe,
		);

		return [...own, ...linked.sections.flatMap((section) => section.needs)];
	}

	async function handleMade() {
		setIsWorking(true);
		setErrorMessage(null);
		setOutcome(null);

		try {
			const [needs, stockItems] = await Promise.all([
				loadNeeds(),
				loadInventoryItems(),
			]);
			const rows = planRecipeConsumption(needs, stockItems);
			const operation = startRecipeConsumption(recipePublicId, rows);
			const results = await consume(operation);

			setOutcome({
				rows,
				operation,
				failedNeedIds: new Set(
					results.filter((result) => !result.ok).map((result) => result.needId),
				),
				isUndone: false,
			});
		} catch {
			setErrorMessage("在庫から引けませんでした。通信を確認してください");
		} finally {
			setIsWorking(false);
		}
	}

	async function handleRetry() {
		if (!outcome) {
			return;
		}

		setIsWorking(true);
		setErrorMessage(null);

		try {
			const results = await consume(outcome.operation, outcome.failedNeedIds);

			setOutcome({
				...outcome,
				failedNeedIds: new Set(
					results.filter((result) => !result.ok).map((result) => result.needId),
				),
			});
		} finally {
			setIsWorking(false);
		}
	}

	async function handleUndo() {
		if (!outcome) {
			return;
		}

		setIsWorking(true);
		setErrorMessage(null);

		try {
			await undo(outcome.operation.sourceId);
			setOutcome({ ...outcome, isUndone: true, failedNeedIds: new Set() });
		} catch {
			setErrorMessage(
				"元に戻せませんでした。通信を確認して、もう一度お試しください",
			);
		} finally {
			setIsWorking(false);
		}
	}

	const consumedCount = outcome
		? outcome.operation.entries.length - outcome.failedNeedIds.size
		: 0;

	return (
		<section className={styles.container} aria-label="作った">
			{outcome ? (
				<div className={styles.panel}>
					<h3 className={styles.heading}>
						{outcome.isUndone
							? "元に戻しました"
							: `在庫から${consumedCount}件を引きました`}
					</h3>

					{outcome.isUndone ? (
						<p className={styles.hint}>在庫を、引く前の状態に戻しました。</p>
					) : (
						<ul className={styles.list}>
							{outcome.rows.map((row) => (
								<li className={styles.row} key={row.need.id}>
									<span className={styles.status}>
										{describeRow(row, outcome.failedNeedIds.has(row.need.id))}
									</span>
								</li>
							))}
						</ul>
					)}

					{errorMessage ? (
						<p className={styles.error} role="alert">
							{errorMessage}
						</p>
					) : null}

					<div className={styles.actions}>
						{!outcome.isUndone && outcome.failedNeedIds.size > 0 ? (
							<button
								className={styles.cancelButton}
								type="button"
								disabled={isWorking}
								onClick={() => void handleRetry()}
							>
								引けなかった分をやり直す
							</button>
						) : null}
						{!outcome.isUndone && consumedCount > 0 ? (
							<button
								className={styles.applyButton}
								type="button"
								disabled={isWorking}
								onClick={() => void handleUndo()}
							>
								元に戻す
							</button>
						) : null}
						<button
							className={styles.cancelButton}
							type="button"
							disabled={isWorking}
							onClick={() => setOutcome(null)}
						>
							閉じる
						</button>
					</div>
				</div>
			) : (
				<>
					<button
						className={styles.openButton}
						type="button"
						disabled={isWorking}
						onClick={() => void handleMade()}
					>
						作った（在庫から引く）
					</button>
					<p className={styles.hint}>
						使った分を、在庫からすぐに引きます。間違えたときは、あとから「元に戻す」で戻せます。
					</p>
					{errorMessage ? (
						<p className={styles.error} role="alert">
							{errorMessage}
						</p>
					) : null}
				</>
			)}
		</section>
	);
}
