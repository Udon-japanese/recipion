import * as v from "valibot";

import type {
	InventoryAdjustmentRepository,
	MadeRecipeStockRepository,
} from "./inventory-adjustment-repository";

export const stockMadeRecipeInputSchema = v.object({
	recipePublicId: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1),
		v.maxLength(100),
	),
	// 再送しても二重に入らないよう、操作を始めるときに決めておく。
	transactionId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(100)),
	// 「作った」の操作の印（元に戻すで、引いた分といっしょに戻す）。
	sourceId: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(200)),
	// 入れる回分（人数を変えて作ったときは、その割合。0.5回分など）。
	quantity: v.pipe(v.number(), v.finite(), v.gtValue(0), v.maxValue(100)),
});

export type StockMadeRecipeInput = v.InferOutput<
	typeof stockMadeRecipeInputSchema
>;

// 「作った」で、できあがり（作り置き）を、quantity 回分、在庫に入れる（入れるかどうかは、押すときに本人が決める）。自分のレシピだけ。
export async function stockMadeRecipe(
	input: StockMadeRecipeInput,
	repository: InventoryAdjustmentRepository & MadeRecipeStockRepository,
) {
	const { inventoryItemId } = await repository.ensureMadeRecipeItem(
		input.recipePublicId,
	);

	return {
		inventoryItemId,
		...(await repository.applyAdjustment({
			transactionId: input.transactionId,
			inventoryItemId,
			inputQuantity: input.quantity,
			inputUnitCode: "count",
			stockQuantityPerInputUnit: 1,
			operation: "increase",
			reason: "recipe-production",
			sourceType: "recipe",
			sourceId: input.sourceId,
			// 作った日から冷蔵。期限は、決めない（あとからロットで直せる）。
			lot: { storage: "fridge" },
		})),
	};
}
