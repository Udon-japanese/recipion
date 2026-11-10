import { UserFacingError } from "#/errors/user-facing-error";
import { convertToStockQuantity } from "#/features/ingredients/domain/convert-to-stock-quantity";
import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import {
	type InventoryLotInput,
	type InventoryLotPurchaseUnit,
	toPurchaseUnit,
} from "../domain/inventory-lot";
import type { CreateIngredientRegistrationInput } from "./create-ingredient-registration";
import type {
	InventoryAdjustmentRepository,
	InventoryAdjustmentRepositoryResult,
} from "./inventory-adjustment-repository";
import type { InventoryItemResolver } from "./inventory-item-resolver";

export type RecordInventoryPurchaseInput = CreateIngredientRegistrationInput & {
	transactionId: string;
	shoppingItemId: string;
	inputQuantity: number;
	inputUnitCode: string;
	stockQuantityPerInputUnit: number;
	lot?: InventoryLotInput;
};

export type RecordInventoryPurchaseDependencies = {
	inventoryItemResolver: InventoryItemResolver;
	inventoryAdjustmentRepository: InventoryAdjustmentRepository;
};

export async function recordInventoryPurchase(
	input: RecordInventoryPurchaseInput,
	dependencies: RecordInventoryPurchaseDependencies,
): Promise<InventoryAdjustmentRepositoryResult> {
	const resolvedInventoryItem =
		await dependencies.inventoryItemResolver.resolveOrCreateInventoryItem({
			ingredientName: input.ingredientName,
			stockUnitCode: input.stockUnitCode,
			stockUnitLabel: input.stockUnitLabel,
			trackingMode: input.trackingMode,
		});

	// すでにある在庫の単位が、買い物メモの換算の単位と違うとき（在庫の単位を変えた、先に別の単位で登録した、など）は、
	// 買った量を、在庫の単位へ換算して足す。換算できなければ、数量が狂うので、足さずに失敗にする。
	const quantity = toStockUnitQuantity(input, resolvedInventoryItem);

	return dependencies.inventoryAdjustmentRepository.applyAdjustment({
		transactionId: input.transactionId,
		inventoryItemId: resolvedInventoryItem.inventoryItemId,
		inputQuantity: quantity.inputQuantity,
		inputUnitCode: quantity.inputUnitCode,
		stockQuantityPerInputUnit: quantity.stockQuantityPerInputUnit,
		operation: "increase",
		reason: "purchase",
		sourceType: "shopping-item",
		sourceId: input.shoppingItemId,
		// ロットに、買った単位の換算（1玉＝40g、1個＝110g など）を残す。
		lot: { ...input.lot, purchaseUnit: quantity.purchaseUnit },
	});
}

type StockUnitQuantity = {
	inputQuantity: number;
	inputUnitCode: string;
	stockQuantityPerInputUnit: number;
	// ロットに残す換算。
	purchaseUnit: InventoryLotPurchaseUnit | null;
};

function toStockUnitQuantity(
	input: RecordInventoryPurchaseInput,
	resolved: {
		name: string;
		stockUnitCode: "count" | "g" | "ml";
		stockUnitLabel: string;
		trackingMode: string;
	},
): StockUnitQuantity {
	// 買い物メモの換算での、1単位あたりの量の単位（g・ml・個数の呼び名）。
	const quantityUnitLabel = input.stockUnitLabel;
	const asIs = {
		inputQuantity: input.inputQuantity,
		inputUnitCode: input.inputUnitCode,
		stockQuantityPerInputUnit: input.stockQuantityPerInputUnit,
		purchaseUnit: toPurchaseUnit({
			inputUnitCode: input.inputUnitCode,
			quantity: input.stockQuantityPerInputUnit,
			quantityUnitLabel,
		}),
	};

	// 有無だけの食材は、量を使わない。
	if (resolved.trackingMode === "presence") {
		return { ...asIs, purchaseUnit: null };
	}

	const isSameUnit =
		resolved.stockUnitCode === input.stockUnitCode &&
		(resolved.stockUnitCode !== "count" ||
			resolved.stockUnitLabel === input.stockUnitLabel);

	if (isSameUnit) {
		return asIs;
	}

	// 在庫の単位が個数で、個数の単位（個・玉など）で買い、1つあたりを g・ml で決めたとき（1個＝110g など）：
	// 買った個数のまま足す（重さから個数に直さない）。1つあたりの重さは、ロットの換算に残す。
	const isCountPurchase =
		input.inputUnitCode === "count" ||
		input.inputUnitCode === resolved.stockUnitLabel;

	if (
		resolved.stockUnitCode === "count" &&
		input.stockUnitCode !== "count" &&
		isCountPurchase
	) {
		return {
			inputQuantity: input.inputQuantity,
			inputUnitCode: resolved.stockUnitCode,
			stockQuantityPerInputUnit: 1,
			purchaseUnit: toPurchaseUnit({
				inputUnitCode:
					input.inputUnitCode === "count"
						? resolved.stockUnitLabel
						: input.inputUnitCode,
				quantity: input.stockQuantityPerInputUnit,
				quantityUnitLabel,
			}),
		};
	}

	// 買い物メモの換算での、在庫の単位の量（g / ml / 個数の呼び名つき）。
	const amount = input.inputQuantity * input.stockQuantityPerInputUnit;
	const converted = convertToStockQuantity(
		{
			quantity: amount,
			unitLabel:
				input.stockUnitCode === "count"
					? input.stockUnitLabel
					: input.stockUnitCode,
			stockUnitCode: resolved.stockUnitCode,
			stockUnitLabel: resolved.stockUnitLabel,
		},
		findIngredientCatalogEntry(input.ingredientName),
	);

	if (converted === null) {
		throw new UserFacingError(
			`${resolved.name}の在庫の単位（${resolved.stockUnitLabel}）に買った量を換算できません`,
		);
	}

	return {
		inputQuantity: converted,
		inputUnitCode: resolved.stockUnitCode,
		stockQuantityPerInputUnit: 1,
		purchaseUnit: null,
	};
}
