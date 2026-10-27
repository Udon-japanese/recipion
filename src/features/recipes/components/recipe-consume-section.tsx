import { useId, useMemo, useState } from "react";
import { Button } from "#/components/button/button";
import { Checkbox } from "#/components/checkbox/checkbox";
import { CornerSheet } from "#/components/corner-sheet/corner-sheet";
import { Note } from "#/components/note/note";
import type { UndoRecipeConsumptionResult } from "#/features/inventory/application/inventory-adjustment-repository";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import type { InventoryListItem } from "#/features/inventory/application/inventory-query-repository";
import { formatStockAmount } from "#/features/quantity/domain/format-quantity";
import {
	addAlternativeConsumption,
	type RecipeConsumptionEntryResult,
	type RecipeConsumptionOperation,
	startRecipeConsumption,
} from "../application/consume-recipe-ingredients";
import { loadLinkedShoppingSections } from "../application/load-linked-shopping-sections";
import type { RecipeDetail } from "../application/recipe-repository";
import { resolveIngredientLinks } from "../domain/link-ingredient-needs";
import {
	collectMadeRecipeStock,
	type MadeRecipeUse,
	madeRecipeNeedIdPrefix,
	planMadeRecipeConsumption,
} from "../domain/made-recipe-stock";
import { mergeRecipeNeeds } from "../domain/merge-recipe-needs";
import {
	planRecipeConsumption,
	type RecipeConsumptionAlternative,
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
	// 自分のレシピのとき、できあがりを在庫に入れる入口（押すときに、入れるかどうかを決める）。
	// defaultChecked は、レシピの「作り置き」の設定（入れるかどうかの初期値）。
	madeRecipe?: {
		name: string;
		defaultChecked: boolean;
		produce: (input: {
			sourceId: string;
			transactionId: string;
		}) => Promise<void>;
	};
};

type Outcome = {
	rows: RecipeConsumptionRow[];
	operation: RecipeConsumptionOperation;
	failedNeedIds: ReadonlySet<string>;
	isUndone: boolean;
	// できあがりを在庫に入れる操作（作り置きでなければ、なし）。transactionId は、再送しても二重に入らないための印。
	production: { transactionId: string; isDone: boolean } | null;
	// 元に戻したとき、すでに使っていて戻せなかった、できあがりの量（回分）。
	unreturnedProduction: number;
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
			if (row.need.id.startsWith(madeRecipeNeedIdPrefix)) {
				return `${name}：在庫のできあがりを、${formatStockAmount(row.deduct ?? 0, "count")}${unit}引きました（材料は引いていません）`;
			}

			return `${name}：${formatStockAmount(row.deduct ?? 0, row.target?.stockUnitCode ?? "count")}${unit}を引きました${row.viaStandIn && row.target ? `（${row.target.name}から）` : ""}`;
		case "partial":
			return `${name}：在庫が足りず、${formatStockAmount(row.deduct ?? 0, row.target?.stockUnitCode ?? "count")}${unit}だけ引きました（必要な量は${formatStockAmount(row.required ?? 0, row.target?.stockUnitCode ?? "count")}${unit}）`;
		case "presence-only":
			return `${name}：「ある」で管理しているため、減らしていません`;
		case "unmeasurable":
			return `${name}：量が決まっていない（または換算できない）ため、減らしていません`;
		case "no-stock":
			return row.alternatives.length > 0
				? `${name}：在庫にないため、引いていません（${row.alternatives.map((alternative) => alternative.name).join("、")}の在庫があります）`
				: `${name}：在庫にないため、引いていません`;
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
	madeRecipe,
}: RecipeConsumeSectionProps) {
	const [isWorking, setIsWorking] = useState(false);
	const [isUndoing, setIsUndoing] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [outcome, setOutcome] = useState<Outcome | null>(null);
	const [putInStock, setPutInStock] = useState(
		madeRecipe?.defaultChecked ?? false,
	);
	const putInStockId = useId();
	// リンク先のレシピは、在庫のできあがり（作り置き）があれば、先にそれから使う（初期値）。材料から作るときは、外す。
	const [useMadeStock, setUseMadeStock] = useState(true);
	const useMadeStockId = useId();

	const resolvedNeeds = useMemo(
		() =>
			resolveIngredientLinks(flattenRecipeIngredients(ingredients), linkViews),
		[ingredients, linkViews],
	);

	if (!ownerScope || ownerScope === "guest" || resolvedNeeds.length === 0) {
		return null;
	}

	// 引く材料と、在庫のできあがり（作り置き）から使う分（リンク先のレシピ）。
	async function loadNeeds(stockItems: readonly InventoryListItem[]): Promise<{
		needs: RecipeShoppingNeed[];
		madeUses: MadeRecipeUse[];
	}> {
		const own = resolvedNeeds.filter((need) => !need.linkedRecipe);

		if (!loadLinkedRecipe || !resolvedNeeds.some((need) => need.linkedRecipe)) {
			return { needs: mergeRecipeNeeds(own), madeUses: [] };
		}

		const linked = await loadLinkedShoppingSections(
			resolvedNeeds,
			loadLinkedRecipe,
			useMadeStock ? collectMadeRecipeStock(stockItems) : new Map(),
		);

		// 同じ食材の行は、1行にまとめる（引き算が1回になる）。
		return {
			needs: mergeRecipeNeeds([
				...own,
				...linked.sections.flatMap((section) => section.needs),
			]),
			madeUses: linked.madeUses,
		};
	}

	// できあがりを在庫に入れる（再送しても、二重には入らない）。入れられなければ false。
	async function produceOnce(
		sourceId: string,
		transactionId: string,
	): Promise<boolean> {
		if (!madeRecipe) {
			return true;
		}

		try {
			await madeRecipe.produce({ sourceId, transactionId });

			return true;
		} catch {
			return false;
		}
	}

	async function handleMade() {
		setIsWorking(true);
		setErrorMessage(null);
		setOutcome(null);

		try {
			const stockItems = await loadInventoryItems();
			const { needs, madeUses } = await loadNeeds(stockItems);
			// 在庫のできあがり（作り置き）を先に引く。その分の材料は、needs に含まれない。
			const rows = [
				...planMadeRecipeConsumption(madeUses, stockItems),
				...planRecipeConsumption(needs, stockItems),
			];
			const operation = startRecipeConsumption(recipePublicId, rows);
			const results = await consume(operation);
			const productionId = crypto.randomUUID();

			setOutcome({
				rows,
				operation,
				failedNeedIds: new Set(
					results.filter((result) => !result.ok).map((result) => result.needId),
				),
				isUndone: false,
				production:
					madeRecipe && putInStock
						? {
								transactionId: productionId,
								isDone: await produceOnce(operation.sourceId, productionId),
							}
						: null,
				unreturnedProduction: 0,
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
			const production =
				outcome.production && !outcome.production.isDone
					? {
							...outcome.production,
							isDone: await produceOnce(
								outcome.operation.sourceId,
								outcome.production.transactionId,
							),
						}
					: outcome.production;

			setOutcome({
				...outcome,
				production,
				failedNeedIds: new Set(
					results.filter((result) => !result.ok).map((result) => result.needId),
				),
			});
		} finally {
			setIsWorking(false);
		}
	}

	// 在庫にない材料を、形が決まっている代わりの食材（冷凍玉ねぎ(みじん切り)など）から引く。
	async function handleUseAlternative(
		row: RecipeConsumptionRow,
		alternative: RecipeConsumptionAlternative,
	) {
		if (!outcome) {
			return;
		}

		setIsWorking(true);
		setErrorMessage(null);

		try {
			const added = addAlternativeConsumption(
				outcome.operation,
				row,
				alternative,
			);
			const results = await consume(added.operation, new Set([row.need.id]));
			const failed = results.some((result) => !result.ok);

			setOutcome({
				...outcome,
				operation: added.operation,
				rows: outcome.rows.map((current) =>
					current.need.id === row.need.id ? added.row : current,
				),
				failedNeedIds: failed
					? new Set([...outcome.failedNeedIds, row.need.id])
					: outcome.failedNeedIds,
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
		setIsUndoing(true);
		setErrorMessage(null);

		try {
			const result = await undo(outcome.operation.sourceId);

			setOutcome({
				...outcome,
				isUndone: true,
				failedNeedIds: new Set(),
				unreturnedProduction: result.unreturnedProduction,
			});
		} catch {
			setErrorMessage(
				"元に戻せませんでした。通信を確認して、もう一度お試しください",
			);
		} finally {
			setIsWorking(false);
			setIsUndoing(false);
		}
	}

	const consumedCount = outcome
		? outcome.operation.entries.length - outcome.failedNeedIds.size
		: 0;
	const hasPendingProduction =
		outcome?.production !== null && outcome?.production?.isDone === false;
	const hasLinkedRecipes = resolvedNeeds.some((need) => need.linkedRecipe);
	const hasUndoableWork =
		consumedCount > 0 || outcome?.production?.isDone === true;

	return (
		<section className={styles.container} aria-label="作った">
			{hasLinkedRecipes ? (
				<div className={styles.checkRow}>
					<Checkbox
						id={useMadeStockId}
						label="リンク先のレシピは、在庫のできあがりから使う"
						checked={useMadeStock}
						disabled={isWorking}
						onChange={(event) => setUseMadeStock(event.target.checked)}
					/>
					<label htmlFor={useMadeStockId} aria-hidden="true">
						リンク先のレシピは、在庫のできあがりから使う
					</label>
				</div>
			) : null}
			{madeRecipe ? (
				<div className={styles.checkRow}>
					<Checkbox
						id={putInStockId}
						label="できあがりを、在庫に入れる"
						checked={putInStock}
						disabled={isWorking}
						onChange={(event) => setPutInStock(event.target.checked)}
					/>
					<label htmlFor={putInStockId} aria-hidden="true">
						できあがりを、在庫に入れる
					</label>
				</div>
			) : null}
			<Button
				fullWidth
				status={isWorking && !outcome ? "pending" : "idle"}
				pendingLabel="在庫から引いています"
				onClick={() => void handleMade()}
			>
				つくった！
			</Button>
			{errorMessage && !outcome ? (
				<Note tone="error">{errorMessage}</Note>
			) : null}

			<CornerSheet
				open={outcome !== null}
				onDismiss={() => {
					if (!isWorking) {
						setOutcome(null);
					}
				}}
				eyebrow={outcome?.isUndone ? undefined : "「つくった」を記録しました"}
				title={
					outcome?.isUndone
						? "元に戻しました"
						: `在庫から${consumedCount}件を引きました`
				}
				left={
					outcome && !outcome.isUndone && hasUndoableWork
						? {
								label: "元に戻す",
								icon: "undo",
								disabled: isWorking,
								pending: isUndoing,
								onClick: () => void handleUndo(),
							}
						: undefined
				}
				right={{
					label: "閉じる",
					icon: "check",
					disabled: isWorking,
					onClick: () => setOutcome(null),
				}}
			>
				{outcome ? (
					<div className={styles.sheetBody}>
						{outcome.isUndone ? (
							<>
								<p className={styles.hint}>
									在庫を、引く前の状態に戻しました。
								</p>
								{outcome.unreturnedProduction > 0 ? (
									<Note tone="warn">
										{`${madeRecipe?.name ?? "できあがり"}は、すでに使っていたため、${formatStockAmount(outcome.unreturnedProduction, "count")}回分は、在庫から減らせませんでした。`}
									</Note>
								) : null}
							</>
						) : (
							<>
								{outcome.failedNeedIds.size > 0 || hasPendingProduction ? (
									<Button
										variant="secondary"
										fullWidth
										disabled={isWorking}
										onClick={() => void handleRetry()}
									>
										{hasPendingProduction && outcome.failedNeedIds.size === 0
											? "在庫に入れる分をやり直す"
											: "引けなかった分をやり直す"}
									</Button>
								) : null}
								<ul className={styles.list}>
									{outcome.production && madeRecipe ? (
										<li className={styles.row}>
											<span className={styles.status}>
												{outcome.production.isDone
													? `${madeRecipe.name}：1回分を、在庫に入れました`
													: `${madeRecipe.name}：在庫に入れられませんでした`}
											</span>
										</li>
									) : null}
									{outcome.rows.map((row) => (
										<li className={styles.row} key={row.need.id}>
											<span className={styles.status}>
												{describeRow(
													row,
													outcome.failedNeedIds.has(row.need.id),
												)}
											</span>
											{row.alternatives.map((alternative) => (
												<Button
													variant="secondary"
													size="sm"
													key={alternative.inventoryItemId}
													disabled={isWorking}
													onClick={() =>
														void handleUseAlternative(row, alternative)
													}
												>
													{`${alternative.name}を引く（${formatStockAmount(alternative.deduct, alternative.stockUnitCode)}${alternative.stockUnitLabel}）`}
												</Button>
											))}
										</li>
									))}
								</ul>
							</>
						)}

						{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}
					</div>
				) : null}
			</CornerSheet>
		</section>
	);
}
