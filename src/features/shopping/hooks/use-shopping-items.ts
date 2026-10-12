import { useEffect, useState } from "react";
import type { ShoppingRepository } from "../application/shopping-repository";
import { getShoppingErrorMessage } from "../components/shopping-error-message";
import {
	type CreateShoppingItemInput,
	createShoppingItem,
	type ShoppingItem,
	type UpdateShoppingItemInput,
	updateShoppingItem,
} from "../domain/shopping-item";
import { categorizeUnassignedShoppingItems } from "../domain/shopping-item-categorization";
import {
	type ShoppingAisleDirection,
	sortShoppingItemsByCategory,
} from "../domain/shopping-item-category-order";
import {
	moveShoppingItem,
	moveShoppingItemToIndex,
	type ShoppingItemMoveDirection,
} from "../domain/shopping-item-order";

// 買い物メモの項目の読み込みと、追加・更新・削除・並び替え。
// 操作は、保存に成功したあとで画面の状態に反映する。失敗したときは、エラーの文を出して false を返す。
export function useShoppingItems(repository: ShoppingRepository) {
	const [items, setItems] = useState<ShoppingItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isReordering, setIsReordering] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		let isActive = true;

		async function loadItems() {
			try {
				const storedItems = await repository.list();
				const categorizedItems = categorizeUnassignedShoppingItems(storedItems);
				const categoryChanged = categorizedItems.some(
					(item, index) => item !== storedItems[index],
				);

				if (isActive) {
					setItems(categorizedItems);
				}

				if (categoryChanged) {
					try {
						await repository.saveAll(categorizedItems);
					} catch {
						if (isActive) {
							setErrorMessage("買い物メモの商品カテゴリを保存できませんでした");
						}
					}
				}
			} catch {
				if (isActive) {
					setErrorMessage("買い物メモを読み込めませんでした");
				}
			} finally {
				if (isActive) {
					setIsLoading(false);
				}
			}
		}

		void loadItems();

		return () => {
			isActive = false;
		};
	}, [repository]);

	async function run(action: () => Promise<void>): Promise<boolean> {
		setErrorMessage(null);

		try {
			await action();

			return true;
		} catch (error) {
			setErrorMessage(getShoppingErrorMessage(error));

			return false;
		}
	}

	function replaceItem(updatedItem: ShoppingItem) {
		setItems((currentItems) =>
			currentItems.map((currentItem) =>
				currentItem.id === updatedItem.id ? updatedItem : currentItem,
			),
		);
	}

	function addItem(input: CreateShoppingItemInput): Promise<boolean> {
		return run(async () => {
			const nextSortOrder =
				items.reduce(
					(highestSortOrder, item) =>
						Math.max(highestSortOrder, item.sortOrder),
					-1,
				) + 1;
			const item = createShoppingItem(input, new Date(), nextSortOrder);

			await repository.save(item);
			setItems((currentItems) => [...currentItems, item]);
		});
	}

	// 項目を作り直して（検証つき）保存する。成功したら、更新後の項目を返す。
	async function changeItem(
		change: () => ShoppingItem,
	): Promise<ShoppingItem | null> {
		let changedItem: ShoppingItem | null = null;

		await run(async () => {
			const updatedItem = change();

			await repository.save(updatedItem);
			replaceItem(updatedItem);
			changedItem = updatedItem;
		});

		return changedItem;
	}

	function updateItem(item: ShoppingItem, input: UpdateShoppingItemInput) {
		return changeItem(() => updateShoppingItem(item, input));
	}

	function removeItem(id: string): Promise<boolean> {
		return run(async () => {
			await repository.remove(id);
			setItems((currentItems) => currentItems.filter((item) => item.id !== id));
		});
	}

	async function reorder(
		createOrder: (currentItems: ShoppingItem[]) => ShoppingItem[],
	): Promise<boolean> {
		setIsReordering(true);

		try {
			return await run(async () => {
				const reorderedItems = createOrder(items);

				await repository.saveAll(reorderedItems);
				setItems(reorderedItems);
			});
		} finally {
			setIsReordering(false);
		}
	}

	function moveItem(itemId: string, direction: ShoppingItemMoveDirection) {
		return reorder((current) => moveShoppingItem(current, itemId, direction));
	}

	function sortByCategory(direction: ShoppingAisleDirection) {
		return reorder((current) =>
			sortShoppingItemsByCategory(current, { direction }),
		);
	}

	function dragMove(fromIndex: number, toIndex: number) {
		if (fromIndex === toIndex) {
			return Promise.resolve(true);
		}

		return reorder((current) =>
			moveShoppingItemToIndex(current, fromIndex, toIndex),
		);
	}

	return {
		items,
		isLoading,
		isReordering,
		errorMessage,
		setErrorMessage,
		replaceItem,
		addItem,
		changeItem,
		updateItem,
		removeItem,
		moveItem,
		sortByCategory,
		dragMove,
	};
}
