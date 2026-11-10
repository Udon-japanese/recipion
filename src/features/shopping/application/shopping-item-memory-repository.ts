import type {
	ShoppingItemMemories,
	ShoppingItemMemory,
} from "../domain/shopping-item-memory";

export type ShoppingItemMemoryRepository = {
	// 食材名のキー → いつもの買い方。
	list(): Promise<ShoppingItemMemories>;
	// 同じ食材の記憶は、置き換える。
	setAll(memories: readonly ShoppingItemMemory[]): Promise<void>;
};
