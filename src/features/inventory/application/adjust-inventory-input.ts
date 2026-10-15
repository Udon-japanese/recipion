import * as v from "valibot";
import { UserFacingError } from "#/errors/user-facing-error";
import type { InventoryAdjustmentCommand } from "./inventory-adjustment-repository";
import { inventoryLotInputSchema } from "./inventory-lot-input";

const positiveQuantitySchema = v.pipe(
	v.number(),
	v.finite("数量には有限の数値を指定してください"),
	v.gtValue(0, "数量は0より大きい数にしてください"),
);

const requiredTextSchema = v.pipe(
	v.string(),
	v.trim(),
	v.minLength(1, "値を入力してください"),
);

export const adjustInventoryInputSchema = v.object({
	transactionId: v.pipe(v.string(), v.uuid("取引IDが不正です")),
	inventoryItemId: v.pipe(v.string(), v.uuid("在庫項目IDが不正です")),
	inputQuantity: positiveQuantitySchema,
	inputUnitCode: requiredTextSchema,
	stockQuantityPerInputUnit: positiveQuantitySchema,
	operation: v.picklist(["increase", "decrease"]),
	reason: v.picklist(["purchase", "recipe-consumption", "manual-adjustment"]),
	sourceType: v.optional(v.picklist(["shopping-item", "recipe"])),
	sourceId: v.optional(requiredTextSchema),
	// 追加するとき、ロットの条件（保存方法・期限など）を指定する。
	lot: v.optional(inventoryLotInputSchema),
	allocations: v.optional(
		v.pipe(
			v.array(
				v.object({
					lotId: v.pipe(v.string(), v.uuid("ロットIDが不正です")),
					quantity: positiveQuantitySchema,
				}),
			),
			v.minLength(1, "ロットを指定してください"),
		),
	),
});

export function parseAdjustInventoryInput(
	input: unknown,
): InventoryAdjustmentCommand {
	const command = v.parse(adjustInventoryInputSchema, input);

	// ロットの指定は、減らすときだけ。
	if (command.allocations && command.operation !== "decrease") {
		throw new UserFacingError("ロットを指定できるのは、減らすときだけです");
	}

	if (command.lot && command.operation !== "increase") {
		throw new UserFacingError(
			"ロットの条件を指定できるのは、追加するときだけです",
		);
	}

	return command;
}
