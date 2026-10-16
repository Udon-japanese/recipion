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
	isListedShoppingItem,
	moveListedShoppingItem,
	moveListedShoppingItemByOne,
	type ShoppingItemMoveDirection,
} from "../domain/shopping-item-order";
import { upsertById } from "../domain/upsert-by-id";

// 買い物メモの項目の読み込みと、追加・更新・削除・並び替え。
// 操作は、保存に成功したあとで画面の状態に反映する。失敗したときは、エラーの文を出して false を返す。
export function useShoppingItems(repository: ShoppingRepository) {
	// 分岐型のメモの中の項目も含む、すべての項目。
	const [allItems, setItems] = useState<ShoppingItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [isReordering, setIsReordering] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	useEffect(() => {
		let isActive = true;

		// 最初に届いた一覧だけ、カテゴリが未設定の項目を自動で埋めて保存する。
		async function applyInitialItems(storedItems: ShoppingItem[]) {
			const categorizedItems = categorizeUnassignedShoppingItems(storedItems);
			const categoryChanged = categorizedItems.some(
				(item, index) => item !== storedItems[index],
			);

			if (isActive) {
				setItems(categorizedItems);
				setIsLoading(false);
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
		}

		function handleLoadError() {
			if (isActive) {
				setErrorMessage("買い物メモを読み込めませんでした");
				setIsLoading(false);
			}
		}

		// 購読できる保存先（Dexie）は、別のタブや画面の外からの変更も、自動で受け取る。
		if (repository.watch) {
			let isInitial = true;
			const unsubscribe = repository.watch((storedItems) => {
				if (!isActive) {
					return;
				}

				if (isInitial) {
					isInitial = false;
					void applyInitialItems(storedItems);

					return;
				}

				setItems(storedItems);
			}, handleLoadError);

			return () => {
				isActive = false;
				unsubscribe();
			};
		}

		repository.list().then(applyInitialItems, handleLoadError);

		return () => {
			isActive = false;
		};
	}, [repository]);

	// 通常の一覧の項目（分岐の中の項目は、条件が決まるまで、一覧に出さない）。
	const items = allItems.filter((item) => !item.branchId);

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
				allItems.reduce(
					(highestSortOrder, item) =>
						Math.max(highestSortOrder, item.sortOrder),
					-1,
				) + 1;
			const item = createShoppingItem(input, new Date(), nextSortOrder);

			await repository.save(item);
			setItems((currentItems) => upsertById(currentItems, item));
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

	// 店が消えたとき、画面の項目の店を「どこでも」に戻す（保存は、店の削除の側で済んでいる）。
	function clearStore(storeId: string) {
		setItems((currentItems) =>
			currentItems.map((item) =>
				item.storeId === storeId ? { ...item, storeId: null } : item,
			),
		);
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
				setItems((current) => [
					...reorderedItems,
					...current.filter((item) => item.branchId),
				]);
			});
		} finally {
			setIsReordering(false);
		}
	}

	// 一覧の中で、1つ上／下へ（購入済みは、位置に数えない）。
	function moveItem(itemId: string, direction: ShoppingItemMoveDirection) {
		return reorder((current) =>
			moveListedShoppingItemByOne(
				current,
				isListedShoppingItem,
				itemId,
				direction,
			),
		);
	}

	function sortByCategory(direction: ShoppingAisleDirection) {
		return reorder((current) =>
			sortShoppingItemsByCategory(current, { direction }),
		);
	}

	// ドラッグでの並び替え（位置は、一覧に出している項目の中のもの。分類をまたいで動かせる）。
	function dragMove(fromIndex: number, toIndex: number) {
		if (fromIndex === toIndex) {
			return Promise.resolve(true);
		}

		return reorder((current) =>
			moveListedShoppingItem(current, isListedShoppingItem, fromIndex, toIndex),
		);
	}

	return {
		items,
		allItems,
		setItems,
		isLoading,
		isReordering,
		errorMessage,
		setErrorMessage,
		replaceItem,
		addItem,
		changeItem,
		updateItem,
		removeItem,
		clearStore,
		moveItem,
		sortByCategory,
		dragMove,
	};
}
