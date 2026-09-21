import type { ShoppingItem } from "../domain/shopping-item";

export interface ShoppingRepository {
	list(): Promise<ShoppingItem[]>;
	findById(id: string): Promise<ShoppingItem | undefined>;
	save(item: ShoppingItem): Promise<void>;
	saveAll(items: readonly ShoppingItem[]): Promise<void>;
	remove(id: string): Promise<void>;
}
