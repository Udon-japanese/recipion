import type { ShoppingItemMemoryRepository } from "#/features/shopping/application/shopping-item-memory-repository";
import type { ShoppingItemMemories } from "#/features/shopping/domain/shopping-item-memory";

export type FakeShoppingItemMemoryRepository = ShoppingItemMemoryRepository & {
	// いま保存されている記憶。結果の状態を確かめるのに使う。
	readonly memories: ShoppingItemMemories;
};

// メモリ上で本当に動く偽のリポジトリ。
export function createFakeShoppingItemMemoryRepository(
	initial: ShoppingItemMemories = {},
): FakeShoppingItemMemoryRepository {
	let stored: ShoppingItemMemories = { ...initial };

	return {
		get memories() {
			return stored;
		},
		async list() {
			return { ...stored };
		},
		async setAll(memories) {
			stored = {
				...stored,
				...Object.fromEntries(
					memories.map((memory) => [memory.nameKey, memory]),
				),
			};
		},
	};
}
