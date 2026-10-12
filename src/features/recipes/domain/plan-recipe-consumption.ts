import { convertToStockQuantity } from "#/features/ingredients/domain/convert-to-stock-quantity";
import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import { findInventoryItemByName } from "#/features/inventory/domain/build-expiry-prefill";
import type { InventoryUnitCode } from "#/features/inventory/domain/inventory-unit";
import {
	findStandInItems,
	type RecipeShoppingNeed,
	type RecipeShoppingStockItem,
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
	// 在庫に登録がない、または在庫が0。
	| "no-stock";

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
};

function round(value: number): number {
	return Number(value.toFixed(6));
}

function requiredIn(
	need: RecipeShoppingNeed,
	stockUnitCode: InventoryUnitCode,
): number | null {
	if (need.quantity === null) {
		return null;
	}

	return convertToStockQuantity(
		{
			quantity: need.quantity,
			unitLabel: need.unitLabel,
			stockUnitCode,
		},
		findIngredientCatalogEntry(need.name),
	);
}

/**
 * レシピの材料から、在庫から引く量を決める（実行は別）。
 * - 数量を在庫の単位に換算できて、在庫が足りれば、必要な量を引く。
 * - 在庫が足りなければ、冷凍などの代わりの食材で全量が足りるときはそちらから、なければ、ある分だけ引く。
 * - 「少々」「適量」や、換算できない分量は、引かない（塩・醤油などは、減らさない）。
 * - 同じ食材が複数行あるときは、残りの在庫を、順に使う。
 */
export function planRecipeConsumption(
	needs: readonly RecipeShoppingNeed[],
	stockItems: readonly RecipeConsumptionStockItem[],
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
		const standIns = findStandInItems(need.name, stockItems).filter(
			(item) => remainingOf(item) > 0,
		);

		const unmeasurable: RecipeConsumptionRow = {
			need,
			status: "unmeasurable",
			target: null,
			deduct: null,
			required: null,
			viaStandIn: false,
		};

		// 比べられない分量は、引かない（食材が在庫にあるかどうかに関わらず）。
		const probeUnit = (ownStock ?? standIns[0])?.stockUnitCode;

		if (need.quantity === null) {
			return unmeasurable;
		}

		if (probeUnit === undefined) {
			return {
				...unmeasurable,
				status: "no-stock",
			};
		}

		const requiredOwn = ownStock
			? requiredIn(need, ownStock.stockUnitCode)
			: null;

		if (ownStock && requiredOwn === null) {
			return unmeasurable;
		}

		if (
			ownStock &&
			requiredOwn !== null &&
			remainingOf(ownStock) >= requiredOwn
		) {
			take(ownStock, requiredOwn);

			return {
				need,
				status: "consume",
				target: toTarget(ownStock),
				deduct: requiredOwn,
				required: requiredOwn,
				viaStandIn: false,
			};
		}

		for (const standIn of standIns) {
			const requiredStandIn = requiredIn(need, standIn.stockUnitCode);

			if (requiredStandIn !== null && remainingOf(standIn) >= requiredStandIn) {
				take(standIn, requiredStandIn);

				return {
					need,
					status: "consume",
					target: toTarget(standIn),
					deduct: requiredStandIn,
					required: requiredStandIn,
					viaStandIn: true,
				};
			}
		}

		if (ownStock && requiredOwn !== null) {
			const available = remainingOf(ownStock);

			take(ownStock, available);

			return {
				need,
				status: "partial",
				target: toTarget(ownStock),
				deduct: available,
				required: requiredOwn,
				viaStandIn: false,
			};
		}

		// 自分の食材の在庫がなく、代わりの食材でも全量は足りない。
		return { ...unmeasurable, status: "no-stock" };
	});
}
