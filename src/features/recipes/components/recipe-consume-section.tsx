import { useMemo, useState } from "react";
import { Button } from "#/components/button/button";
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
import {
	type SkippedReason,
	summarizeConsumptionRows,
} from "../domain/summarize-consumption-rows";
import { RecipeMadeOptions } from "./recipe-made-options";
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

const skippedLabels: Record<SkippedReason, string> = {
	"no-stock": "在庫にないため、引いていません",
	unmeasurable:
		"量が決まっていない（または換算できない）ため、減らしていません",
	"presence-only": "「ある」で管理しているため、減らしていません",
};

// 引いた行を、材料（左）と数量（右）、補足（あれば）に分ける。
function describeDeducted(row: RecipeConsumptionRow): {
	amount: string;
	note: string | null;
} {
	const unit = row.target?.stockUnitLabel ?? "";
	const code = row.target?.stockUnitCode ?? "count";

	if (row.need.id.startsWith(madeRecipeNeedIdPrefix)) {
		return {
			amount: `${formatStockAmount(row.deduct ?? 0, "count")}${unit}`,
			note: "在庫のできあがりから（材料は引いていません）",
		};
	}

	const amount = `${formatStockAmount(row.deduct ?? 0, code)}${unit}`;

	if (row.status === "partial") {
		return {
			amount,
			note: `在庫が足りず、ある分だけ（必要な量は${formatStockAmount(row.required ?? 0, code)}${unit}）`,
		};
	}

	return {
		amount,
		note: row.viaStandIn && row.target ? `${row.target.name}から` : null,
	};
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
	// リンク先のレシピは、在庫のできあがり（作り置き）があれば、先にそれから使う（初期値）。材料から作るときは、外す。
	const [useMadeStock, setUseMadeStock] = useState(true);

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
	const summary = summarizeConsumptionRows(
		outcome?.rows ?? [],
		outcome?.failedNeedIds ?? new Set(),
	);
	const hasLinkedRecipes = resolvedNeeds.some((need) => need.linkedRecipe);
	const hasUndoableWork =
		consumedCount > 0 || outcome?.production?.isDone === true;

	return (
		<section className={styles.container} aria-label="作った">
			<div className={styles.madeBar}>
				{hasLinkedRecipes || madeRecipe ? (
					<RecipeMadeOptions
						disabled={isWorking}
						options={[
							...(madeRecipe
								? [
										{
											label: "できあがりも在庫に入れる",
											checked: putInStock,
											onChange: setPutInStock,
										},
									]
								: []),
							...(hasLinkedRecipes
								? [
										{
											label: "リンク先は在庫のできあがりを使う",
											checked: useMadeStock,
											onChange: setUseMadeStock,
										},
									]
								: []),
						]}
					/>
				) : null}
				<Button
					status={isWorking && !outcome ? "pending" : "idle"}
					pendingLabel="在庫から引いています"
					onClick={() => void handleMade()}
				>
					つくった！
				</Button>
			</div>
			{/* 初めの状態と違うものだけ、短く知らせる（作り置きのレシピなら、在庫に入れるのが初めの状態）。 */}
			{madeRecipe && putInStock ? (
				<p className={styles.madeNote}>できあがりも在庫に入れます</p>
			) : null}
			{hasLinkedRecipes && !useMadeStock ? (
				<p className={styles.madeNote}>リンク先も材料から引きます</p>
			) : null}
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
								{outcome.production && madeRecipe ? (
									<p className={styles.status}>
										{outcome.production.isDone
											? `${madeRecipe.name}：1回分を、在庫に入れました`
											: `${madeRecipe.name}：在庫に入れられませんでした`}
									</p>
								) : null}
								{summary.failed.length > 0 ? (
									<ul className={styles.list}>
										{summary.failed.map((row) => (
											<li className={styles.row} key={row.need.id}>
												<span className={styles.status}>
													{`${row.need.name}：引けませんでした`}
												</span>
											</li>
										))}
									</ul>
								) : null}
								{summary.hasAlternatives.length > 0 ? (
									<ul className={styles.list}>
										{summary.hasAlternatives.map((row) => (
											<li className={styles.row} key={row.need.id}>
												<span className={styles.status}>
													{`${row.need.name}：在庫にないため、引いていません（${row.alternatives.map((alternative) => alternative.name).join("、")}の在庫があります）`}
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
								) : null}
								{summary.deducted.length > 0 ? (
									<ul className={styles.list} aria-label="引いたもの">
										{summary.deducted.map((row) => {
											const { amount, note } = describeDeducted(row);

											return (
												<li className={styles.amountRow} key={row.need.id}>
													<span>{row.need.name}</span>
													<span className={styles.amount}>{amount}</span>
													{note ? (
														<span className={styles.note}>{note}</span>
													) : null}
												</li>
											);
										})}
									</ul>
								) : null}
								{summary.skipped.map((group) => (
									<section
										className={styles.skippedGroup}
										key={group.reason}
										aria-label={skippedLabels[group.reason]}
									>
										<p className={styles.skippedLabel}>
											{`${skippedLabels[group.reason]}（${group.names.length}件）`}
										</p>
										<p className={styles.skippedNames}>
											{group.names.join("、")}
										</p>
									</section>
								))}
							</>
						)}

						{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}
					</div>
				) : null}
			</CornerSheet>
		</section>
	);
}
