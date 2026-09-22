import * as v from "valibot";
import type { InventoryTrackingMode } from "#/features/inventory/domain/apply-inventory-adjustment";
import type { InventoryUnitCode } from "#/features/inventory/domain/inventory-unit";
import {
	isShoppingCategoryId,
	type ShoppingCategoryId,
} from "./shopping-category";

const shoppingCategoryIdSchema = v.custom<ShoppingCategoryId>(
	(input) => typeof input === "string" && isShoppingCategoryId(input),
	"商品カテゴリを確認してください",
);

export type ShoppingCategoryAssignment = "automatic" | "manual" | null;

export type ShoppingItemStatus = "pending" | "checked" | "purchased";

export type ShoppingItemInventoryConversion = {
	inputUnitCode: string;
	stockUnitCode: InventoryUnitCode;
	stockUnitLabel: string;
	stockQuantityPerInputUnit: number;
	trackingMode: InventoryTrackingMode;
};

export type ShoppingItem = {
	id: string;
	name: string;
	quantity: number;
	unitLabel: string | null;
	inventoryConversion: ShoppingItemInventoryConversion | null;
	categoryId: ShoppingCategoryId | null;
	categoryAssignment: ShoppingCategoryAssignment;
	status: ShoppingItemStatus;
	sortOrder: number;
	createdAt: string;
	updatedAt: string;
};

const inventoryConversionSchema = v.object({
	inputUnitCode: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "購入単位を入力してください"),
	),
	stockUnitCode: v.picklist(["count", "g", "ml"]),
	stockUnitLabel: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "在庫の表示単位を入力してください"),
	),
	stockQuantityPerInputUnit: v.pipe(
		v.number(),
		v.finite("換算数量には有限の数値を指定してください"),
		v.gtValue(0, "1単位あたりの在庫数量は0より大きくしてください"),
	),
	trackingMode: v.picklist(["exact", "estimated"]),
});

const shoppingCategoryAssignmentSchema = v.picklist(["automatic", "manual"]);

export const createShoppingItemInputSchema = v.object({
	name: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "商品名を入力してください"),
	),
	quantity: v.optional(
		v.pipe(
			v.number(),
			v.finite("数量には有限の数値を指定してください"),
			v.gtValue(0, "数量は0より大きい数にしてください"),
		),
	),
	unitLabel: v.optional(v.nullable(v.pipe(v.string(), v.trim()))),
	inventoryConversion: v.optional(v.nullable(inventoryConversionSchema)),
	categoryId: v.optional(v.nullable(shoppingCategoryIdSchema)),
	categoryAssignment: v.optional(v.nullable(shoppingCategoryAssignmentSchema)),
});

export type CreateShoppingItemInput = v.InferInput<
	typeof createShoppingItemInputSchema
>;

export const updateShoppingItemInputSchema = v.object({
	name: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "商品名を入力してください"),
	),
	quantity: v.pipe(
		v.number(),
		v.finite("数量には有限の数値を指定してください"),
		v.gtValue(0, "数量は0より大きい数にしてください"),
	),
	inventoryConversion: v.optional(v.nullable(inventoryConversionSchema)),
	unitLabel: v.nullable(v.pipe(v.string(), v.trim())),
	categoryId: v.optional(v.nullable(shoppingCategoryIdSchema)),
	categoryAssignment: v.optional(v.nullable(shoppingCategoryAssignmentSchema)),
});

export type UpdateShoppingItemInput = v.InferInput<
	typeof updateShoppingItemInputSchema
>;

export type ShoppingItemEditedIdentity = {
	name: string;
	unitLabel: string | null;
};

export function preserveShoppingItemInventoryConversion(
	item: ShoppingItem,
	edited: ShoppingItemEditedIdentity,
): ShoppingItemInventoryConversion | null {
	const nameWasChanged = edited.name.trim() !== item.name;
	const unitWasChanged = edited.unitLabel?.trim() !== item.unitLabel;

	if (nameWasChanged || unitWasChanged) {
		return null;
	}

	return item.inventoryConversion;
}

export function createShoppingItem(
	input: CreateShoppingItemInput,
	now = new Date(),
	sortOrder = 0,
): ShoppingItem {
	const parsedInput = v.parse(createShoppingItemInputSchema, input);
	const timestamp = now.toISOString();

	return {
		id: crypto.randomUUID(),
		name: parsedInput.name,
		quantity: parsedInput.quantity ?? 1,
		unitLabel: parsedInput.unitLabel || null,
		categoryId: parsedInput.categoryId ?? null,
		inventoryConversion: parsedInput.inventoryConversion ?? null,
		categoryAssignment:
			parsedInput.categoryAssignment !== undefined
				? parsedInput.categoryAssignment
				: parsedInput.categoryId
					? "manual"
					: null,
		status: "pending",
		sortOrder,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
}

export function updateShoppingItem(
	item: ShoppingItem,
	input: UpdateShoppingItemInput,
	now = new Date(),
): ShoppingItem {
	const parsedInput = v.parse(updateShoppingItemInputSchema, input);
	const categoryId =
		parsedInput.categoryId === undefined
			? item.categoryId
			: parsedInput.categoryId;

	const categoryAssignment =
		parsedInput.categoryAssignment !== undefined
			? parsedInput.categoryAssignment
			: parsedInput.categoryId === undefined
				? item.categoryAssignment
				: "manual";

	return {
		...item,
		name: parsedInput.name,
		quantity: parsedInput.quantity,
		inventoryConversion:
			parsedInput.inventoryConversion === undefined
				? item.inventoryConversion
				: parsedInput.inventoryConversion,
		unitLabel: parsedInput.unitLabel || null,
		categoryId,
		categoryAssignment,
		updatedAt: now.toISOString(),
	};
}

export function toggleShoppingItem(
	item: ShoppingItem,
	now = new Date(),
): ShoppingItem {
	if (item.status === "purchased") {
		return item;
	}

	return {
		...item,
		status: item.status === "pending" ? "checked" : "pending",
		updatedAt: now.toISOString(),
	};
}

export function markShoppingItemAsPurchased(
	item: ShoppingItem,
	now = new Date(),
): ShoppingItem {
	if (item.status === "pending") {
		throw new Error("チェック済みの商品だけ購入確定できます");
	}

	if (item.status === "purchased") {
		return item;
	}

	return {
		...item,
		status: "purchased",
		updatedAt: now.toISOString(),
	};
}

export function getShoppingItemConvertedQuantityLabel(
	item: ShoppingItem,
): string | null {
	const conversion = item.inventoryConversion;

	if (!conversion) {
		return null;
	}

	const isSameUnit =
		conversion.inputUnitCode === conversion.stockUnitCode &&
		conversion.stockQuantityPerInputUnit === 1;

	if (isSameUnit) {
		return null;
	}

	const convertedQuantity = Number(
		(item.quantity * conversion.stockQuantityPerInputUnit).toFixed(6),
	);

	return `${convertedQuantity}${conversion.stockUnitLabel}`;
}
