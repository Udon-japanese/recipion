import type { ShoppingItem } from "#/features/shopping/domain/shopping-item";

// テスト用の買い物項目。ShoppingItem に項目が増えても、足すのはここだけにする。
export function buildShoppingItem(
	overrides: Partial<ShoppingItem> = {},
): ShoppingItem {
	return {
		id: "item-1",
		name: "卵",
		quantity: 1,
		unitLabel: null,
		inventoryConversion: null,
		categoryId: null,
		categoryAssignment: null,
		storeId: null,
		branchId: null,
		branchSide: null,
		status: "pending",
		sortOrder: 0,
		createdAt: "2026-09-21T10:00:00.000Z",
		updatedAt: "2026-09-21T10:00:00.000Z",
		...overrides,
	};
}
