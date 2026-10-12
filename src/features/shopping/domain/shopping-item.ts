import * as v from "valibot";
import type { InventoryTrackingMode } from "#/features/inventory/domain/apply-inventory-adjustment";
import { inventoryTrackingModeSchema } from "#/features/inventory/domain/inventory-tracking-mode";
import type { InventoryUnitCode } from "#/features/inventory/domain/inventory-unit";
import { inferInventoryConversion } from "./infer-inventory-conversion";
import type { ShoppingBranchRole } from "./shopping-branch";
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
	// 買う店（ShoppingStore の ID）。null は「どこでも」。
	storeId: string | null;
	// 分岐型のメモの中の項目（ShoppingBranch の ID と、どちらの側か）。通常の項目は null。
	// 分岐の中の項目は、条件が決まるまで、チェックも購入もできない。
	branchId: string | null;
	branchSide: ShoppingBranchRole | null;
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
	trackingMode: inventoryTrackingModeSchema,
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
	storeId: v.optional(v.nullable(v.string())),
	branchId: v.optional(v.nullable(v.string())),
	branchSide: v.optional(v.nullable(v.picklist(["condition", "then", "else"]))),
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
	storeId: v.optional(v.nullable(v.string())),
});

export type UpdateShoppingItemInput = v.InferInput<
	typeof updateShoppingItemInputSchema
>;

export type ShoppingItemEditedIdentity = {
	name: string;
	unitLabel: string | null;
};

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
		// 換算を指定しないときは、食材と単位から決める（決められなければ、購入確定のときに設定する）。
		inventoryConversion:
			parsedInput.inventoryConversion ??
			inferInventoryConversion(parsedInput.name, parsedInput.unitLabel || null),
		categoryAssignment:
			parsedInput.categoryAssignment !== undefined
				? parsedInput.categoryAssignment
				: parsedInput.categoryId
					? "manual"
					: null,
		storeId: parsedInput.storeId ?? null,
		branchId: parsedInput.branchId ?? null,
		branchSide: parsedInput.branchId ? (parsedInput.branchSide ?? null) : null,
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

	const unitLabel = parsedInput.unitLabel || null;

	const isSameIdentity =
		parsedInput.name === item.name && unitLabel === item.unitLabel;

	// 指定がなければ、名前と単位が同じ間は今の換算を保ち、変わったら（または未設定なら）食材と単位から決め直す。
	const inventoryConversion =
		parsedInput.inventoryConversion ??
		(isSameIdentity ? item.inventoryConversion : null) ??
		inferInventoryConversion(parsedInput.name, unitLabel);

	return {
		...item,
		name: parsedInput.name,
		quantity: parsedInput.quantity,
		unitLabel,
		categoryId,
		categoryAssignment,
		inventoryConversion,
		storeId:
			parsedInput.storeId === undefined ? item.storeId : parsedInput.storeId,
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

// 日用品（トイレットペーパーなど）は、食材の在庫に入れない。購入確定でも、在庫換算を求めない。
export function isInventoryTrackedShoppingItem(item: ShoppingItem): boolean {
	return item.categoryId !== "household";
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

	// 有無だけで管理する食材は、数量に換算しない（数字を見せない）。
	if (!conversion || conversion.trackingMode === "presence") {
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
