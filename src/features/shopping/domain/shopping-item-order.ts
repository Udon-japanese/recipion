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

	if (targetIndex < 0 || targetIndex >= orderedItems.length) {
		return orderedItems;
	}

	const reorderedItems = [...orderedItems];
	const [movedItem] = reorderedItems.splice(currentIndex, 1);

	if (!movedItem) {
		return orderedItems;
	}

	reorderedItems.splice(targetIndex, 0, movedItem);

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
