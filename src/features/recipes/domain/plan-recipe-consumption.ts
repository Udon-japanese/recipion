import { convertToStockQuantity } from "#/features/ingredients/domain/convert-to-stock-quantity";
import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import { findInventoryItemByName } from "#/features/inventory/domain/build-expiry-prefill";
import type { InventoryUnitCode } from "#/features/inventory/domain/inventory-unit";
import { findStandInCandidates, type StandInMode } from "./find-stand-ins";
import type {
	RecipeShoppingNeed,
	RecipeShoppingStockItem,
} from "./plan-shopping-from-recipe";

// 在庫の1食材（引く先になりうるもの）。
export type RecipeConsumptionStockItem = RecipeShoppingStockItem & {
	inventoryItemId: string;
};

export type RecipeConsumptionStatus =
	// 必要な量を、全部引く。
	| "consume"
	// 在庫が足りないので、ある分だけ引く。
	| "partial"
	// 「少々」「適量」や、換算できない分量。在庫を減らさない。
	| "unmeasurable"
	// 「有無だけ」で管理している食材（塩・醤油・油など）。在庫を減らさない。
	| "presence-only"
	// 在庫に登録がない、または在庫が0。
	| "no-stock"
	// 代わりの食材（冷凍野菜など）で足りるが、使うかどうかを本人が選ぶ。選ぶまで、引かない。
	| "choose";

// 本人が選んだときだけ引く先：代わりの食材（設定・形の決まった冷凍）か、足りないが、ある分だけの自分の食材。
export type RecipeConsumptionAlternative = {
	inventoryItemId: string;
	name: string;
	stockUnitCode: InventoryUnitCode;
	stockUnitLabel: string;
	// 引く量（在庫の単位）。
	deduct: number;
	// 自分の食材（ある分だけ引く）なら true。
	isOwn: boolean;
	// 自分の食材のとき、レシピが必要とする量（在庫の単位）。
	required: number;
};

export type RecipeConsumptionRow = {
	need: RecipeShoppingNeed;
	status: RecipeConsumptionStatus;
	// 引く先の食材（引かないときは null）。
	target: {
		inventoryItemId: string;
		name: string;
		stockUnitCode: InventoryUnitCode;
		stockUnitLabel: string;
	} | null;
	// 引く量（在庫の単位）。引かないときは null。
	deduct: number | null;
	// レシピが必要とする量（在庫の単位）。比べられないときは null。
	required: number | null;
	// 冷凍の食材など、代わりの食材の在庫から引くとき true。
	viaStandIn: boolean;
	// 選ぶとき（choose）の、引く先の候補。
	alternatives: RecipeConsumptionAlternative[];
};

function round(value: number): number {
	return Number(value.toFixed(6));
}

function requiredIn(
	need: RecipeShoppingNeed,
	stock: { stockUnitCode: InventoryUnitCode; stockUnitLabel: string },
): number | null {
	if (need.quantity === null) {
		return null;
	}

	return convertToStockQuantity(
		{
			quantity: need.quantity,
			unitLabel: need.unitLabel,
			stockUnitCode: stock.stockUnitCode,
			stockUnitLabel: stock.stockUnitLabel,
		},
		findIngredientCatalogEntry(need.name),
	);
}

/**
 * レシピの材料から、在庫から引く量を決める（実行は別）。
 * - 数量を在庫の単位に換算できて、在庫が足りれば、必要な量を引く。
 * - 在庫が足りなければ、代わりの食材（冷凍野菜など）を見る。それだけで全量を満たすものだけを使う（findStandInCandidates）。
 *   自動で使うものはそちらから引き、本人が選ぶものは、選ぶまで引かない（choose）。どちらもなければ、ある分だけ引く。
 * - 「有無だけ」で管理している食材（塩・醤油・油など）は、減らさない。
 * - 「少々」「適量」や、換算できない分量は、引かない。
 * - 同じ食材が複数行あるときは、残りの在庫を、順に使う。
 */
export function planRecipeConsumption(
	needs: readonly RecipeShoppingNeed[],
	stockItems: readonly RecipeConsumptionStockItem[],
	standInMode: StandInMode = "auto",
): RecipeConsumptionRow[] {
	const remaining = new Map(
		stockItems.map((item) => [item.inventoryItemId, item.quantity]),
	);

	const remainingOf = (item: RecipeConsumptionStockItem) =>
		remaining.get(item.inventoryItemId) ?? 0;

	const toTarget = (item: RecipeConsumptionStockItem) => ({
		inventoryItemId: item.inventoryItemId,
		name: item.name,
		stockUnitCode: item.stockUnitCode,
		stockUnitLabel: item.stockUnitLabel,
	});

	const take = (item: RecipeConsumptionStockItem, amount: number) => {
		remaining.set(item.inventoryItemId, round(remainingOf(item) - amount));
	};

	return needs.map((need): RecipeConsumptionRow => {
		const own = findInventoryItemByName(stockItems, need.name);
		const ownStock = own && remainingOf(own) > 0 ? own : undefined;
		const candidates = findStandInCandidates(
			need,
			stockItems,
			standInMode,
			remainingOf,
		);

		const row = (
			status: RecipeConsumptionStatus,
			fields: Partial<RecipeConsumptionRow> = {},
		): RecipeConsumptionRow => ({
			need,
			status,
			target: null,
			deduct: null,
			required: null,
			viaStandIn: false,
			alternatives: [],
			...fields,
		});

		// 有無だけで管理している食材は、量にかかわらず、減らさない。
		if (ownStock?.trackingMode === "presence") {
			return row("presence-only", { target: toTarget(ownStock) });
		}

		const autoPresence = candidates.auto.find(
			(candidate) => candidate.item.trackingMode === "presence",
		);

		if (!ownStock && autoPresence) {
			return row("presence-only", {
				target: toTarget(autoPresence.item),
				viaStandIn: true,
			});
		}

		// 比べられない分量は、引かない（食材が在庫にあるかどうかに関わらず）。
		if (need.quantity === null) {
			return row("unmeasurable");
		}

		const requiredOwn = ownStock ? requiredIn(need, ownStock) : null;

		if (ownStock && requiredOwn === null) {
			return row("unmeasurable");
		}

		if (
			ownStock &&
			requiredOwn !== null &&
			remainingOf(ownStock) >= requiredOwn
		) {
			take(ownStock, requiredOwn);

			return row("consume", {
				target: toTarget(ownStock),
				deduct: requiredOwn,
				required: requiredOwn,
			});
		}

		for (const { item, required } of candidates.auto) {
			if (required !== null) {
				take(item, required);

				return row("consume", {
					target: toTarget(item),
					deduct: required,
					required,
					viaStandIn: true,
				});
			}
		}

		// 有無だけの代わりの食材は、引く量がないので、選ぶ候補にしない。
		const askAlternatives = candidates.ask.flatMap(
			({ item, required }): RecipeConsumptionAlternative[] =>
				required === null
					? []
					: [{ ...toTarget(item), deduct: required, isOwn: false, required }],
		);

		if (askAlternatives.length > 0) {
			return row("choose", {
				alternatives: [
					...askAlternatives,
					...(ownStock && requiredOwn !== null
						? [
								{
									...toTarget(ownStock),
									deduct: remainingOf(ownStock),
									isOwn: true,
									required: requiredOwn,
								},
							]
						: []),
				],
			});
		}

		if (ownStock && requiredOwn !== null) {
			const available = remainingOf(ownStock);

			take(ownStock, available);

			return row("partial", {
				target: toTarget(ownStock),
				deduct: available,
				required: requiredOwn,
			});
		}

		return row("no-stock");
	});
}
