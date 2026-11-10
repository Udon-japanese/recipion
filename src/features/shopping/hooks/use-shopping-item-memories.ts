import { useEffect, useState } from "react";
import type { ShoppingItemMemoryRepository } from "../application/shopping-item-memory-repository";
import type { ShoppingItem } from "../domain/shopping-item";
import {
	type ShoppingItemMemories,
	type ShoppingItemMemory,
	toShoppingItemMemory,
} from "../domain/shopping-item-memory";

type UseShoppingItemMemoriesOptions = {
	repository: ShoppingItemMemoryRepository;
	// 覚えた時刻（ミリ秒）。テストで差し替える。
	now?: () => number;
};

// 食材ごとの、いつもの買い方（前回の数量・単位・カテゴリ）。読み書きに失敗しても、買い物メモの操作は止めない。
export function useShoppingItemMemories({
	repository,
	now = Date.now,
}: UseShoppingItemMemoriesOptions) {
	const [memories, setMemories] = useState<ShoppingItemMemories>({});

	useEffect(() => {
		let isActive = true;

		repository
			.list()
			.then((loaded) => {
				if (isActive) {
					setMemories(loaded);
				}
			})
			.catch(() => {
				// 読めなければ、記憶なしとして動く（カタログの既定を使う）。
			});

		return () => {
			isActive = false;
		};
	}, [repository]);

	// 項目の内容を、その食材のいつもの買い方として覚える（同じ食材は、あとの項目で置き換える）。
	async function rememberItems(
		items: readonly Pick<
			ShoppingItem,
			"name" | "quantity" | "unitLabel" | "categoryId" | "categoryAssignment"
		>[],
	) {
		const usedAt = now();
		const next = new Map<string, ShoppingItemMemory>();

		for (const item of items) {
			const memory = toShoppingItemMemory(item, usedAt);

			if (memory) {
				next.set(memory.nameKey, memory);
			}
		}

		if (next.size === 0) {
			return;
		}

		try {
			await repository.setAll([...next.values()]);
			setMemories((current) => ({
				...current,
				...Object.fromEntries(next),
			}));
		} catch {
			// 覚えられなくても、追加・購入確定などの操作は、成功させる。
		}
	}

	return { memories, rememberItems };
}
