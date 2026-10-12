import type { InventoryListItem } from "#/features/inventory/application/inventory-query-repository";

// テスト用の在庫一覧の項目（卵）。InventoryListItem に項目が増えても、足すのはここだけにする。
export function buildInventoryListItem(
	overrides: Partial<InventoryListItem> = {},
): InventoryListItem {
	return {
		inventoryItemId: "inventory-id",
		ingredientId: "ingredient-id",
		name: "卵",
		displayName: null,
		quantity: 6,
		lots: [],
		stockUnitCode: "count",
		stockUnitLabel: "個",
		trackingMode: "exact",
		defaultExpiryKind: null,
		defaultStorage: null,
		updatedAt: "2026-09-23T00:00:00.000Z",
		...overrides,
	};
}
