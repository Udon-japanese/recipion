import type { ShoppingItem } from "./shopping-item";

export type ShoppingItemMoveDirection = "up" | "down";

export function moveShoppingItem(
	items: readonly ShoppingItem[],
	itemId: string,
	direction: ShoppingItemMoveDirection,
	now = new Date(),
): ShoppingItem[] {
	const orderedItems = [...items].sort(
		(left, right) => left.sortOrder - right.sortOrder,
	);
	const currentIndex = orderedItems.findIndex((item) => item.id === itemId);

	if (currentIndex === -1) {
		return orderedItems;
	}

	const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

	return moveShoppingItemToIndex(orderedItems, currentIndex, targetIndex, now);
}

export function moveShoppingItemToIndex(
	items: readonly ShoppingItem[],
	fromIndex: number,
	toIndex: number,
	now = new Date(),
): ShoppingItem[] {
	const orderedItems = [...items].sort(
		(left, right) => left.sortOrder - right.sortOrder,
	);

	if (
		fromIndex < 0 ||
		fromIndex >= orderedItems.length ||
		toIndex < 0 ||
		toIndex >= orderedItems.length ||
		fromIndex === toIndex
	) {
		return orderedItems;
	}

	const reorderedItems = [...orderedItems];
	const [movedItem] = reorderedItems.splice(fromIndex, 1);

	if (!movedItem) {
		return orderedItems;
	}

	reorderedItems.splice(toIndex, 0, movedItem);

	const timestamp = now.toISOString();

	return reorderedItems.map((item, index) => {
		if (item.sortOrder === index) {
			return item;
		}

		return {
			...item,
			sortOrder: index,
			updatedAt: timestamp,
		};
	});
}
