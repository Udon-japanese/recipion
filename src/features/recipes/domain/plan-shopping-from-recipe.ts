import {
	type AmountRange,
	parseAmountRange,
} from "#/features/ingredients/domain/parse-ingredient-line";
import { findInventoryItemByName } from "#/features/inventory/domain/build-expiry-prefill";
import type { InventoryTrackingMode } from "#/features/inventory/domain/inventory-tracking-mode";
import type { InventoryUnitCode } from "#/features/inventory/domain/inventory-unit";
import { findStandInCandidates, type StandInMode } from "./find-stand-ins";
import {
	type IngredientStock,
	type IngredientStockJudgment,
	judgeIngredientStock,
} from "./judge-ingredient-stock";
import type { RecipeEditorIngredientNode } from "./recipe-editor-document";

// レシピの材料1行（グループは含まない）。
export type RecipeShoppingNeed = {
	id: string;
	name: string;
	// 「少々」「適量」「60~70g」など、数量にできない分量は null。
	quantity: number | null;
	unitLabel: string | null;
	amountText: string | null;
	// 分量が範囲（「60~70g」）のとき、その下限と上限（quantity は null のまま）。買い物と「作った」では、上限を使う（withRangeUpperBound）。
	range?: AmountRange;
	// 材料が、他のレシピへのリンクのとき、そのレシピ（そのレシピの材料を、展開して使う。この行自体は、買い物の候補にしない）。
	linkedRecipe?: { publicId: string; name: string };
	// リンク先のレシピから展開した材料のとき、そのレシピの名前（一覧で、まとめて表示する）。
	sectionTitle?: string;
	// 同じ食材の行を1行にまとめたとき、元の分量の原文（内訳の表示用）。まとめていなければ、なし。
	mergedAmountTexts?: string[];
};

// 在庫の1食材（在庫の一覧から、必要な項目だけ）。
export type RecipeShoppingStockItem = {
	name: string;
	quantity: number;
	stockUnitCode: InventoryUnitCode;
	stockUnitLabel: string;
	// 省略は、数量を追う管理。
	trackingMode?: InventoryTrackingMode;
	// 「作った」で入れたできあがり（作り置き）の元のレシピ。ある食材は、名前での突き合わせの対象にしない。
	sourceRecipePublicId?: string;
};

// 買い物メモにある項目（未購入だけを渡す）。
export type RecipeShoppingMemoItem = {
	id: string;
	name: string;
	quantity: number;
	unitLabel: string | null;
};

// 買い物メモに、同じ食材がすでにあるときの扱い。
export type DuplicateMode = "max" | "sum" | "skip";

export type RecipeShoppingStock =
	// 在庫の情報がない（ログインしていない）。必要なものとして扱う。
	| { kind: "unknown" }
	| {
			kind: "judged";
			judgment: IngredientStockJudgment;
			// 代わりになる食材（冷凍野菜など）の在庫で足りているとき、その食材の名前。
			standInName?: string;
			// 代わりの食材の在庫で足りるが、使うかどうかを本人が選ぶもの（設定・形の決まった冷凍）。
			// 足りているとは判定しない（初期でチェックする）。知らせるだけ。量を満たさないものは入れない。
			askStandIns?: RecipeShoppingStandIn[];
	  };

// 知らせる代わりの食材と、その在庫の量。
export type RecipeShoppingStandIn = {
	name: string;
	quantity: number;
	stockUnitCode: InventoryUnitCode;
	stockUnitLabel: string;
	isPresenceOnly: boolean;
};

export type RecipeShoppingRow = {
	need: RecipeShoppingNeed;
	stock: RecipeShoppingStock;
	// 買い物メモに入れる量（足りない分。比べられないときは、レシピの量）。
	amount: { quantity: number; unitLabel: string | null };
	existing: RecipeShoppingMemoItem | null;
	// add: 新しい項目を作る / update: メモの項目の数量を変える / keep: メモのまま（変更なし）。
	plan: "add" | "update" | "keep";
	// keep の理由。
	keepReason: "already-enough" | "skip-mode" | "incomparable-unit" | null;
	// update / add のあとの数量。
	nextQuantity: number;
	defaultChecked: boolean;
};

// 料理の計量の単位は、買う単位にならない（買い物メモでは、「1」で入れる）。
const measuringUnits = new Set([
	"大さじ",
	"小さじ",
	"カップ",
	"ひとつまみ",
	"つ",
	"cm",
	"合",
]);

export function flattenRecipeIngredients(
	nodes: readonly RecipeEditorIngredientNode[],
): RecipeShoppingNeed[] {
	const needs: RecipeShoppingNeed[] = [];

	for (const node of nodes) {
		if (node.type === "group") {
			needs.push(...flattenRecipeIngredients(node.children));
		} else if (node.name.trim() !== "") {
			const range =
				node.quantity === null && node.amountText !== null
					? parseAmountRange(node.amountText)
					: null;

			needs.push({
				id: node.id,
				name: node.name,
				quantity: node.quantity,
				unitLabel: node.unitLabel,
				amountText: node.amountText,
				...(range ? { range } : {}),
			});
		}
	}

	return needs;
}

// 範囲の分量（「60~70g」）を、上限の数量にする。原文の分量は、そのまま残す。
// 買い物も「作った」も上限を使う（在庫が実際より多く見えて、作るときに足りない、を避ける。買う量と引く量もそろう）。
export function withRangeUpperBound(
	need: RecipeShoppingNeed,
): RecipeShoppingNeed {
	return need.quantity === null && need.range
		? { ...need, quantity: need.range.max }
		: need;
}

// レシピの量を、買い物メモの量にする（計量の単位や、数量にできない量は、「1」にする）。
function toMemoAmount(need: RecipeShoppingNeed): {
	quantity: number;
	unitLabel: string | null;
} {
	const isMeasuring =
		need.unitLabel !== null && measuringUnits.has(need.unitLabel);

	if (need.quantity === null || isMeasuring) {
		return { quantity: 1, unitLabel: null };
	}

	return { quantity: need.quantity, unitLabel: need.unitLabel };
}

function roundQuantity(value: number): number {
	return Number(value.toFixed(6));
}

// 買い物メモの項目と、追加する量から、メモの更新を決める（単位が違えば、変えない）。
function resolveDuplicate(
	existing: RecipeShoppingMemoItem,
	amount: { quantity: number; unitLabel: string | null },
	mode: DuplicateMode,
): Pick<RecipeShoppingRow, "plan" | "keepReason" | "nextQuantity"> {
	if (mode === "skip") {
		return {
			plan: "keep",
			keepReason: "skip-mode",
			nextQuantity: existing.quantity,
		};
	}

	if ((existing.unitLabel ?? null) !== (amount.unitLabel ?? null)) {
		return {
			plan: "keep",
			keepReason: "incomparable-unit",
			nextQuantity: existing.quantity,
		};
	}

	const nextQuantity =
		mode === "sum"
			? roundQuantity(existing.quantity + amount.quantity)
			: Math.max(existing.quantity, amount.quantity);

	return nextQuantity === existing.quantity
		? { plan: "keep", keepReason: "already-enough", nextQuantity }
		: { plan: "update", keepReason: null, nextQuantity };
}

export type PlanShoppingFromRecipeInput = {
	needs: readonly RecipeShoppingNeed[];
	// 在庫の一覧。null は、在庫の情報がない（ゲスト）。
	stockItems: readonly RecipeShoppingStockItem[] | null;
	memoItems: readonly RecipeShoppingMemoItem[];
	duplicateMode: DuplicateMode;
	// 冷凍野菜を、生の野菜の代わりに使うか（省略は auto）。
	standInMode?: StandInMode;
};

function toIngredientStock(item: RecipeShoppingStockItem): IngredientStock {
	return {
		quantity: item.quantity,
		stockUnitCode: item.stockUnitCode,
		stockUnitLabel: item.stockUnitLabel,
		isPresenceOnly: item.trackingMode === "presence",
	};
}

// その食材の在庫で足りていなければ、代わりになる食材（冷凍野菜など）の在庫で、必要な量を満たすかも見る。
function judgeWithStandIns(
	need: { name: string; quantity: number | null; unitLabel: string | null },
	stockItem: RecipeShoppingStockItem | undefined,
	stockItems: readonly RecipeShoppingStockItem[],
	mode: StandInMode,
): RecipeShoppingStock {
	const judgment = judgeIngredientStock(
		need,
		stockItem ? toIngredientStock(stockItem) : null,
	);

	if (judgment.status === "enough") {
		return { kind: "judged", judgment };
	}

	const candidates = findStandInCandidates(need, stockItems, mode);
	const [auto] = candidates.auto;

	if (auto) {
		return {
			kind: "judged",
			judgment: {
				status: "enough",
				basis: auto.required === null ? "presence" : "compared",
			},
			standInName: auto.item.name,
		};
	}

	return {
		kind: "judged",
		judgment,
		...(candidates.ask.length > 0
			? {
					askStandIns: candidates.ask.map(({ item }) => ({
						name: item.name,
						quantity: item.quantity,
						stockUnitCode: item.stockUnitCode,
						stockUnitLabel: item.stockUnitLabel,
						isPresenceOnly: item.trackingMode === "presence",
					})),
				}
			: {}),
	};
}

/**
 * レシピの材料から、買い物メモへ入れる項目を決める。
 * - 在庫で足りているか判定する（数量を比べ、比べられなければ、在庫の有無。judgeIngredientStock）。
 * - 足りなければ、代わりの食材（冷凍野菜など）の在庫で、必要な量を満たすかも見る（設定に従う。findStandInCandidates）。
 * - 買い物メモに、同じ食材があれば、扱い（多い方に合わせる／合算／追加しない）に従う（同じ単位の行を優先する）。
 * - 人数による量の調整はしない（レシピの量のまま）。
 */
export function planShoppingFromRecipe(
	input: PlanShoppingFromRecipeInput,
): RecipeShoppingRow[] {
	return input.needs.map((need) => {
		const stockItem = input.stockItems
			? findInventoryItemByName(input.stockItems, need.name)
			: undefined;

		const needForJudgment = {
			name: need.name,
			quantity: need.quantity,
			unitLabel: need.unitLabel,
		};

		const stock: RecipeShoppingStock =
			input.stockItems === null
				? { kind: "unknown" }
				: judgeWithStandIns(
						needForJudgment,
						stockItem,
						input.stockItems,
						input.standInMode ?? "auto",
					);

		const isNeeded =
			stock.kind === "unknown" || stock.judgment.status === "short";

		// 足りない分が分かるときは、その量（在庫の単位）。それ以外は、レシピの量。
		const amount =
			stock.kind === "judged" &&
			stock.judgment.status === "short" &&
			stock.judgment.shortage !== null &&
			stockItem
				? {
						quantity: stock.judgment.shortage,
						unitLabel: stockItem.stockUnitLabel,
					}
				: toMemoAmount(need);

		// 同じ食材の行が複数あれば、追加する量と同じ単位の行を相手にする（なければ、最初の行）。
		// 比べるのは、その1行だけ（ほかの行は変えず、行をまとめることもしない）。
		const sameIngredient = input.memoItems.filter(
			(memoItem) =>
				findInventoryItemByName([memoItem], need.name) !== undefined,
		);
		const existing =
			sameIngredient.find(
				(memoItem) =>
					(memoItem.unitLabel ?? null) === (amount.unitLabel ?? null),
			) ??
			sameIngredient[0] ??
			null;

		if (!existing) {
			return {
				need,
				stock,
				amount,
				existing: null,
				plan: "add" as const,
				keepReason: null,
				nextQuantity: amount.quantity,
				defaultChecked: isNeeded,
			};
		}

		const resolved = resolveDuplicate(existing, amount, input.duplicateMode);

		return {
			need,
			stock,
			amount,
			existing,
			...resolved,
			// すでにメモにあるものは、変更があるときだけ、初期でチェックする。
			defaultChecked: isNeeded && resolved.plan === "update",
		};
	});
}
