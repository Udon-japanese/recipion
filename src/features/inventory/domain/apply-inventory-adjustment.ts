import * as v from "valibot";
import { convertInventoryQuantity } from "./convert-inventory-quantity";

export type InventoryTrackingMode = "exact" | "estimated";

export type InventoryOperation = "increase" | "decrease";

export type InventoryTransactionReason =
	| "purchase"
	| "recipe-consumption"
	| "manual-adjustment";

export type InventoryTransactionSourceType = "shopping-item" | "recipe";

const adjustmentInputSchema = v.object({
	inventoryItemId: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "在庫項目IDを指定してください"),
	),
	currentQuantity: v.pipe(
		v.number(),
		v.finite("現在庫には有限の数値を指定してください"),
		v.minValue(0, "現在庫は0以上にしてください"),
	),
	inputQuantity: v.number(),
	trackingMode: v.picklist(["exact", "estimated"]),
	transactionId: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "取引IDを指定してください"),
	),
	inputUnitCode: v.string(),
	stockUnitCode: v.string(),
	stockQuantityPerInputUnit: v.number(),
	operation: v.picklist(["increase", "decrease"]),
	reason: v.picklist(["purchase", "recipe-consumption", "manual-adjustment"]),
	sourceType: v.optional(v.picklist(["shopping-item", "recipe"])),
	sourceId: v.optional(v.string()),
});

export type ApplyInventoryAdjustmentInput = v.InferInput<
	typeof adjustmentInputSchema
>;

export type InventoryAdjustmentTransaction = {
	id: string;
	inventoryItemId: string;
	inputQuantity: number;
	inputUnitCode: string;
	quantityDelta: number;
	resultingQuantity: number;
	requestedQuantityDelta: number;
	stockUnitCode: string;
	reason: InventoryTransactionReason;
	sourceType: InventoryTransactionSourceType | null;
	sourceId: string | null;
	occurredAt: string;
};

export type InventoryAdjustmentResult = {
	quantity: number;
	transaction: InventoryAdjustmentTransaction;
};

export function applyInventoryAdjustment(
	input: ApplyInventoryAdjustmentInput,
	now = new Date(),
): InventoryAdjustmentResult {
	const parsedInput = v.parse(adjustmentInputSchema, input);

	const convertedQuantity = convertInventoryQuantity({
		inputQuantity: parsedInput.inputQuantity,
		inputUnitCode: parsedInput.inputUnitCode,
		stockUnitCode: parsedInput.stockUnitCode,
		stockQuantityPerInputUnit: parsedInput.stockQuantityPerInputUnit,
	});

	const direction = parsedInput.operation === "increase" ? 1 : -1;

	const requestedQuantityDelta = Number(
		(convertedQuantity.quantity * direction).toFixed(6),
	);

	let quantityDelta = requestedQuantityDelta;
	let resultingQuantity = Number(
		(parsedInput.currentQuantity + quantityDelta).toFixed(6),
	);

	if (resultingQuantity < 0) {
		if (parsedInput.trackingMode === "exact") {
			throw new Error("在庫数量が不足しています");
		}

		quantityDelta = Number((-parsedInput.currentQuantity).toFixed(6));
		resultingQuantity = 0;
	}

	return {
		quantity: resultingQuantity,
		transaction: {
			id: parsedInput.transactionId,
			inventoryItemId: parsedInput.inventoryItemId,
			inputQuantity: parsedInput.inputQuantity,
			inputUnitCode: parsedInput.inputUnitCode.trim(),
			quantityDelta,
			resultingQuantity,
			requestedQuantityDelta,
			stockUnitCode: convertedQuantity.unitCode,
			reason: parsedInput.reason,
			sourceType: parsedInput.sourceType ?? null,
			sourceId: parsedInput.sourceId?.trim() || null,
			occurredAt: now.toISOString(),
		},
	};
}
