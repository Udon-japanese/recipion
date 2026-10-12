import type { ShoppingRepository } from "#/features/shopping/application/shopping-repository";
import type { ShoppingItem } from "#/features/shopping/domain/shopping-item";

type RepositoryMethod = "list" | "findById" | "save" | "saveAll" | "remove";

export type FakeShoppingRepository = ShoppingRepository & {
	// いま保存されている項目（並び順は sortOrder）。結果の状態を確かめるのに使う。
	readonly items: ShoppingItem[];
	// 次の呼び出しを1回だけ失敗させる。
	failNext(method: RepositoryMethod, error?: unknown): void;
};

function sortItems(items: readonly ShoppingItem[]): ShoppingItem[] {
	return [...items].sort((a, b) => a.sortOrder - b.sortOrder);
}

// メモリ上で本当に動く偽のリポジトリ。vi.fn() の並びの代わりに使う。
export function createFakeShoppingRepository(
	initial: readonly ShoppingItem[] = [],
): FakeShoppingRepository {
	let stored = new Map(initial.map((item) => [item.id, item]));
	const failures = new Map<RepositoryMethod, unknown>();

	const snapshot = () => sortItems([...stored.values()]);

	const guard = (method: RepositoryMethod) => {
		if (failures.has(method)) {
			const error = failures.get(method);

			failures.delete(method);
			throw error;
		}
	};

	const repository: FakeShoppingRepository = {
		get items() {
			return snapshot();
		},

		failNext(method, error = new Error(`${method} failed`)) {
			failures.set(method, error);
		},

		async list() {
			guard("list");

			return snapshot();
		},

		async findById(id) {
			guard("findById");

			return stored.get(id);
		},

		async save(item) {
			guard("save");
			stored = new Map(stored).set(item.id, item);
		},

		async saveAll(items) {
			guard("saveAll");
			stored = new Map(stored);
			for (const item of items) {
				stored.set(item.id, item);
			}
		},

		async remove(id) {
			guard("remove");
			stored = new Map(stored);
			stored.delete(id);
		},
	};

	return repository;
}
