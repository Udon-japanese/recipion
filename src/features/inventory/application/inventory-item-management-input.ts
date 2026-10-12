import * as v from "valibot";
import {
	maxInventoryDisplayNameLength,
	type RenameInventoryItemCommand,
} from "./inventory-item-management-repository";

const inventoryItemIdSchema = v.pipe(
	v.string(),
	v.uuid("在庫項目IDが不正です"),
);

const deleteInventoryItemInputSchema = v.object({
	inventoryItemId: inventoryItemIdSchema,
});

const renameInventoryItemInputSchema = v.object({
	inventoryItemId: inventoryItemIdSchema,
	displayName: v.nullable(
		v.pipe(
			v.string(),
			v.trim(),
			v.maxLength(
				maxInventoryDisplayNameLength,
				`名前は${maxInventoryDisplayNameLength}文字までにしてください`,
			),
		),
	),
});

export function parseDeleteInventoryItemInput(input: unknown): {
	inventoryItemId: string;
} {
	return v.parse(deleteInventoryItemInputSchema, input);
}

// 空の名前は、null（食材の名前に戻す）にそろえる。
export function parseRenameInventoryItemInput(
	input: unknown,
): RenameInventoryItemCommand {
	const parsed = v.parse(renameInventoryItemInputSchema, input);

	return {
		inventoryItemId: parsed.inventoryItemId,
		displayName: parsed.displayName === "" ? null : parsed.displayName,
	};
}
