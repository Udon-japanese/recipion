import * as v from "valibot";
import {
	dateStringSchema,
	expiryKindSchema,
	storageSchema,
} from "./inventory-lot-input";
import type {
	SetLotQuantityCommand,
	UpdateInventoryLotCommand,
} from "./inventory-lot-repository";

const updateInventoryLotInputSchema = v.object({
	lotId: v.pipe(v.string(), v.uuid("ロットIDが不正です")),
	expiresOn: v.nullable(dateStringSchema),
	expirySource: v.optional(v.nullable(v.picklist(["entered", "estimated"]))),
	expiryKind: v.nullable(expiryKindSchema),
	storage: v.nullable(storageSchema),
	saveAsIngredientDefault: v.optional(v.boolean(), false),
});

export function parseUpdateInventoryLotInput(
	input: unknown,
): UpdateInventoryLotCommand {
	return v.parse(updateInventoryLotInputSchema, input);
}

const setLotQuantityInputSchema = v.object({
	lotId: v.pipe(v.string(), v.uuid("ロットIDが不正です")),
	quantity: v.pipe(
		v.number(),
		v.finite("数量には有限の数値を指定してください"),
		v.minValue(0, "数量は0以上にしてください"),
	),
});

export function parseSetLotQuantityInput(
	input: unknown,
): SetLotQuantityCommand {
	return v.parse(setLotQuantityInputSchema, input);
}
