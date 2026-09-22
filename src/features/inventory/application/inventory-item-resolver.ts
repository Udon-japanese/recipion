import type { InventoryTrackingMode } from "../domain/apply-inventory-adjustment";
import type { InventoryUnitCode } from "../domain/inventory-unit";
import type { CreateIngredientRegistrationInput } from "./create-ingredient-registration";

export type ResolveOrCreateInventoryItemCommand =
	CreateIngredientRegistrationInput;

export type ResolvedInventoryItem = {
	ingredientId: string;
	inventoryItemId: string;
	name: string;
	stockUnitCode: InventoryUnitCode;
	stockUnitLabel: string;
	trackingMode: InventoryTrackingMode;
};

export interface InventoryItemResolver {
	resolveOrCreateInventoryItem(
		command: ResolveOrCreateInventoryItemCommand,
	): Promise<ResolvedInventoryItem>;
}
