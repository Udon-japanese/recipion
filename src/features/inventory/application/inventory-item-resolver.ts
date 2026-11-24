import type { ItemCategoryId } from "#/features/item-category/domain/item-category";
import type { InventoryTrackingMode } from "../domain/apply-inventory-adjustment";
import type { InventoryUnitCode } from "../domain/inventory-unit";
import type { CreateIngredientRegistrationInput } from "./create-ingredient-registration";

export type ResolveOrCreateInventoryItemCommand =
	CreateIngredientRegistrationInput & {
		// 新しく作る項目と、カテゴリが未設定の項目にだけ入れる（在庫で決めたカテゴリは上書きしない）。
		categoryId?: ItemCategoryId | null;
	};

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
