import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { requireSession } from "#/integrations/better-auth/require-session";

const stockMadeRecipeInputSchema = v.object({
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
});

// 「作った」で、できあがり（作り置き）を、1回分、在庫に入れる（入れるかどうかは、押すときに本人が決める）。自分のレシピだけ。
export const stockMadeRecipeServerFn = createServerFn({
	method: "POST",
})
	.validator((input) => v.parse(stockMadeRecipeInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession();
		const repository = createDrizzleInventoryRepository(db, userId);
		const { inventoryItemId } = await repository.ensureMadeRecipeItem(
			data.recipePublicId,
		);

		return {
			inventoryItemId,
			...(await repository.applyAdjustment({
				transactionId: data.transactionId,
				inventoryItemId,
				inputQuantity: 1,
				inputUnitCode: "count",
				stockQuantityPerInputUnit: 1,
				operation: "increase",
				reason: "recipe-production",
				sourceType: "recipe",
				sourceId: data.sourceId,
				// 作った日から冷蔵。期限は、決めない（あとからロットで直せる）。
				lot: { storage: "fridge" },
			})),
		};
	});
