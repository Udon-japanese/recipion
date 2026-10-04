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
	// 解決した時点の在庫数量（新しく作ったときは 0）。
	quantity: number;
};

export interface InventoryItemResolver {
	resolveOrCreateInventoryItem(
		command: ResolveOrCreateInventoryItemCommand,
	): Promise<ResolvedInventoryItem>;
}
