import {
	type ShoppingCategoryId,
	shoppingCategories,
} from "./shopping-category";
import type { ShoppingItem } from "./shopping-item";
import type { ShoppingItemMoveDirection } from "./shopping-item-order";

export type ShoppingCategoryGroup = {
	// null は、カテゴリが決まっていない項目。
	categoryId: ShoppingCategoryId | null;
	label: string;
	// 項目は、並び順のまま。
	items: ShoppingItem[];
	// 未チェック（まだ買っていない）の数。
	remaining: number;
};

const uncategorizedLabel = "未分類";

function sortBySortOrder(items: readonly ShoppingItem[]): ShoppingItem[] {
	return [...items].sort((left, right) => left.sortOrder - right.sortOrder);
}

export function getShoppingCategoryLabel(
	categoryId: ShoppingCategoryId | null,
): string {
	return (
		shoppingCategories.find((category) => category.id === categoryId)?.label ??
		uncategorizedLabel
	);
}

// 分類の見出しごとにまとめる。見出しの順番は、各分類の先頭の項目の並び順（「売り場順」「逆回り」に従う）。
export function groupShoppingItemsByCategory(
	items: readonly ShoppingItem[],
): ShoppingCategoryGroup[] {
	const groups = new Map<ShoppingCategoryId | null, ShoppingCategoryGroup>();

	for (const item of sortBySortOrder(items)) {
		const group = groups.get(item.categoryId) ?? {
			categoryId: item.categoryId,
			label: getShoppingCategoryLabel(item.categoryId),
			items: [],
			remaining: 0,
		};

		group.items.push(item);

		if (item.status === "pending") {
			group.remaining += 1;
		}

		groups.set(item.categoryId, group);
	}

	return [...groups.values()];
}

// 同じ分類の中だけで、項目を動かす（ほかの分類の項目と、見出しの順番は変えない）。
// fromIndex・toIndex は、その分類の中での位置。
export function moveShoppingItemInCategory(
	items: readonly ShoppingItem[],
	categoryId: ShoppingCategoryId | null,
	fromIndex: number,
	toIndex: number,
	now = new Date(),
): ShoppingItem[] {
	const orderedItems = sortBySortOrder(items);
	const slots = orderedItems.flatMap((item, index) =>
		item.categoryId === categoryId ? [index] : [],
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

	// 分類の項目が使っていた場所へ、新しい順で入れ直す。
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

// 項目を、同じ分類の中で、1つ上／下へ。
export function moveShoppingItemInCategoryByOne(
	items: readonly ShoppingItem[],
	itemId: string,
	direction: ShoppingItemMoveDirection,
	now = new Date(),
): ShoppingItem[] {
	const orderedItems = sortBySortOrder(items);
	const target = orderedItems.find((item) => item.id === itemId);

	if (!target) {
		return orderedItems;
	}

	const members = orderedItems.filter(
		(item) => item.categoryId === target.categoryId,
	);
	const index = members.findIndex((item) => item.id === itemId);

	return moveShoppingItemInCategory(
		orderedItems,
		target.categoryId,
		index,
		direction === "up" ? index - 1 : index + 1,
		now,
	);
}
