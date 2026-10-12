import { convertToStockQuantity } from "#/features/ingredients/domain/convert-to-stock-quantity";
import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import type { InventoryLotInput } from "../domain/inventory-lot";
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
		lot: input.lot,
	});
}

function toStockUnitQuantity(
	input: RecordInventoryPurchaseInput,
	resolved: {
		name: string;
		stockUnitCode: "count" | "g" | "ml";
		stockUnitLabel: string;
		trackingMode: string;
	},
): {
	inputQuantity: number;
	inputUnitCode: string;
	stockQuantityPerInputUnit: number;
} {
	const asIs = {
		inputQuantity: input.inputQuantity,
		inputUnitCode: input.inputUnitCode,
		stockQuantityPerInputUnit: input.stockQuantityPerInputUnit,
	};

	// 有無だけの食材は、量を使わない。
	if (resolved.trackingMode === "presence") {
		return asIs;
	}

	const isSameUnit =
		resolved.stockUnitCode === input.stockUnitCode &&
		(resolved.stockUnitCode !== "count" ||
			resolved.stockUnitLabel === input.stockUnitLabel);

	if (isSameUnit) {
		return asIs;
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
		throw new Error(
			`${resolved.name}の在庫の単位（${resolved.stockUnitLabel}）に、買った量を換算できません`,
		);
	}

	return {
		inputQuantity: converted,
		inputUnitCode: resolved.stockUnitCode,
		stockQuantityPerInputUnit: 1,
	};
}
