import type { ShoppingItem } from "./shopping-item";

export type ShoppingItemMoveDirection = "up" | "down";

function sortBySortOrder(items: readonly ShoppingItem[]): ShoppingItem[] {
	return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

// 買い物メモの一覧に出している項目（購入済みは、別のまとまりにあるので、含めない）。
export function isListedShoppingItem(item: ShoppingItem): boolean {
	return item.status !== "purchased";
}

// 一覧に出している項目だけを、1つの並びとして動かす（位置は、その並びの中のもの）。
// 一覧に出していない項目（購入済みなど）は、場所も順番も変えない。分類をまたいで動かせる。
export function moveListedShoppingItem(
	items: readonly ShoppingItem[],
	isListed: (item: ShoppingItem) => boolean,
	fromIndex: number,
	toIndex: number,
	now = new Date(),
): ShoppingItem[] {
	const orderedItems = sortBySortOrder(items);
	const slots = orderedItems.flatMap((item, index) =>
		isListed(item) ? [index] : [],
	);

	if (
		fromIndex === toIndex ||
		fromIndex < 0 ||
		toIndex < 0 ||
		fromIndex >= slots.length ||
		toIndex >= slots.length
	) {
		return orderedItems;
	}

	const members = slots.flatMap((slot) => {
		const member = orderedItems[slot];

		return member ? [member] : [];
	});
	const [moved] = members.splice(fromIndex, 1);

	if (!moved) {
		return orderedItems;
	}

	members.splice(toIndex, 0, moved);

	// 一覧の項目が使っていた場所へ、新しい順で入れ直す。
	const reordered = [...orderedItems];

	slots.forEach((slot, position) => {
		const member = members[position];

		if (member) {
			reordered[slot] = member;
		}
	});

	const timestamp = now.toISOString();

	return reordered.map((item, index) =>
		item.sortOrder === index
			? item
			: { ...item, sortOrder: index, updatedAt: timestamp },
	);
}

// 項目を、一覧の中で、1つ上／下へ。
export function moveListedShoppingItemByOne(
	items: readonly ShoppingItem[],
	isListed: (item: ShoppingItem) => boolean,
	itemId: string,
	direction: ShoppingItemMoveDirection,
	now = new Date(),
): ShoppingItem[] {
	const orderedItems = sortBySortOrder(items);
	const members = orderedItems.filter(isListed);
	const index = members.findIndex((item) => item.id === itemId);

	if (index === -1) {
		return orderedItems;
	}

	return moveListedShoppingItem(
		orderedItems,
		isListed,
		index,
		direction === "up" ? index - 1 : index + 1,
		now,
	);
}
