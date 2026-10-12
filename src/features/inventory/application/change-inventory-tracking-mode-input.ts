import * as v from "valibot";
import { inventoryTrackingModeSchema } from "../domain/inventory-tracking-mode";
import type { ChangeInventoryTrackingModeCommand } from "./inventory-tracking-mode-repository";

const changeInventoryTrackingModeInputSchema = v.object({
	inventoryItemId: v.pipe(v.string(), v.uuid("在庫項目IDが不正です")),
	trackingMode: inventoryTrackingModeSchema,
	currentQuantity: v.optional(
		v.pipe(
			v.number(),
			v.finite("数量には有限の数値を指定してください"),
			v.minValue(0, "数量は0以上にしてください"),
		),
	),
});

export function parseChangeInventoryTrackingModeInput(
	input: unknown,
): ChangeInventoryTrackingModeCommand {
	return v.parse(changeInventoryTrackingModeInputSchema, input);
}
