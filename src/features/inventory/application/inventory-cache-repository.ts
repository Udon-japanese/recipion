import type { InventoryListItem } from "./inventory-query-repository";

export type InventoryCacheOwnerScope = `user:${string}`;

export type InventoryCacheSnapshot = {
	ownerScope: InventoryCacheOwnerScope;
	items: InventoryListItem[];
	cachedAt: string;
};

export interface InventoryCacheRepository {
	find(
		ownerScope: InventoryCacheOwnerScope,
	): Promise<InventoryCacheSnapshot | undefined>;

	save(
		ownerScope: InventoryCacheOwnerScope,
		items: readonly InventoryListItem[],
		now?: Date,
	): Promise<InventoryCacheSnapshot>;
}
