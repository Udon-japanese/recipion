import {
	type ShoppingCategoryId,
	shoppingCategories,
} from "./shopping-category";
import type { ShoppingItem } from "./shopping-item";
import { inferShoppingCategory } from "./shopping-item-suggestion";

export type ShoppingAisleDirection = "forward" | "reverse";

type SortShoppingItemsByCategoryOptions = {
	categoryOrder?: readonly ShoppingCategoryId[];
	direction?: ShoppingAisleDirection;
	now?: Date;
};

export function sortShoppingItemsByCategory(
	items: readonly ShoppingItem[],
	options: SortShoppingItemsByCategoryOptions = {},
): ShoppingItem[] {
	const categoryOrder =
		options.categoryOrder ?? shoppingCategories.map((category) => category.id);
	const timestamp = (options.now ?? new Date()).toISOString();
	const categoryRanks = new Map(
		categoryOrder.map((categoryId, index) => [categoryId, index]),
	);
	const originalIndexes = new Map(items.map((item, index) => [item.id, index]));

	const categorizedItems = items.map((item) => {
		if (item.categoryId !== null) {
			return item;
		}

		const inferredCategoryId = inferShoppingCategory(item.name);

		if (inferredCategoryId === null) {
			return item;
		}

		return {
			...item,
			categoryId: inferredCategoryId,
		};
	});

	const originalItemsById = new Map(items.map((item) => [item.id, item]));

	const sortedItems = [...categorizedItems].sort((left, right) => {
		const leftRank =
			left.categoryId === null
				? categoryOrder.length
				: (categoryRanks.get(left.categoryId) ?? categoryOrder.length);
		const rightRank =
			right.categoryId === null
				? categoryOrder.length
				: (categoryRanks.get(right.categoryId) ?? categoryOrder.length);

		if (leftRank !== rightRank) {
			return leftRank - rightRank;
		}

		if (left.sortOrder !== right.sortOrder) {
			return left.sortOrder - right.sortOrder;
		}

		return (
			(originalIndexes.get(left.id) ?? 0) - (originalIndexes.get(right.id) ?? 0)
		);
	});

	if (options.direction === "reverse") {
		sortedItems.reverse();
	}

	return sortedItems.map((item, index) => {
		const originalItem = originalItemsById.get(item.id);
		const categoryChanged = originalItem?.categoryId !== item.categoryId;
		const orderChanged = item.sortOrder !== index;

		if (!categoryChanged && !orderChanged) {
			return item;
		}

		return {
			...item,
			sortOrder: index,
			updatedAt: timestamp,
		};
	});
}
