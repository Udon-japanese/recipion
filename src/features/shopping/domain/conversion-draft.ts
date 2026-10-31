import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import type {
	ShoppingItem,
	ShoppingItemInventoryConversion,
} from "./shopping-item";

// 買い物項目を、在庫でどう数えるか（数量・単位と、在庫換算）。
export type ShoppingItemInventoryConfiguration = {
	quantity: number;
	unitLabel: string | null;
	inventoryConversion: ShoppingItemInventoryConversion;
};

// 数量プリセットのある食材は、在庫の単位が決まっている（在庫の登録がカタログの単位に固定するため、
// ここで別の単位を選ぶと、数量が狂う）。
export function getLockedStockUnitCode(
	item: ShoppingItem,
): "count" | "g" | "ml" | null {
	const entry = findIngredientCatalogEntry(item.name);

	return entry && (entry.presets?.length ?? 0) > 0 ? entry.stockUnitCode : null;
}
