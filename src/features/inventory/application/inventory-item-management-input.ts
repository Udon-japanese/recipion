import * as v from "valibot";
import { dishPlacementsSchema } from "#/features/dish-art/domain/dish-cover";
import { maxStockUnitLabelLength } from "#/features/ingredients/domain/list-stock-unit-options";
import {
	type ChangeStockUnitCommand,
	maxInventoryDisplayNameLength,
	type RenameInventoryItemCommand,
	type SetInventoryItemArtCommand,
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

// 絵は、レシピの絵と同じ検証（部品の数・位置・大きさの上限）。空の絵は送らず、null で戻す。
const setInventoryItemArtInputSchema = v.object({
	inventoryItemId: inventoryItemIdSchema,
	art: v.nullable(dishPlacementsSchema),
});

export function parseSetInventoryItemArtInput(
	input: unknown,
): SetInventoryItemArtCommand {
	return v.parse(setInventoryItemArtInputSchema, input);
}

const changeStockUnitInputSchema = v.object({
	inventoryItemId: inventoryItemIdSchema,
	stockUnitCode: v.picklist(["count", "g", "ml"]),
	stockUnitLabel: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1),
		v.maxLength(maxStockUnitLabelLength),
	),
	lotQuantities: v.optional(
		v.array(
			v.object({
				lotId: v.pipe(v.string(), v.uuid("ロットIDが不正です")),
				quantity: v.pipe(
					v.number(),
					v.finite("数量には有限の数値を指定してください"),
					v.minValue(0, "数量は0以上にしてください"),
				),
			}),
		),
	),
});

export function parseChangeStockUnitInput(
	input: unknown,
): ChangeStockUnitCommand {
	return v.parse(changeStockUnitInputSchema, input);
}

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
