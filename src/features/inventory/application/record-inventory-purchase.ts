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

	return dependencies.inventoryAdjustmentRepository.applyAdjustment({
		transactionId: input.transactionId,
		inventoryItemId: resolvedInventoryItem.inventoryItemId,
		inputQuantity: input.inputQuantity,
		inputUnitCode: input.inputUnitCode,
		stockQuantityPerInputUnit: input.stockQuantityPerInputUnit,
		operation: "increase",
		reason: "purchase",
		sourceType: "shopping-item",
		sourceId: input.shoppingItemId,
	});
}
