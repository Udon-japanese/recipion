import type { ShoppingItem } from "./shopping-item";
import { inferShoppingCategory } from "./shopping-item-suggestion";

export function categorizeUnassignedShoppingItems(
	items: readonly ShoppingItem[],
	now = new Date(),
): ShoppingItem[] {
	const timestamp = now.toISOString();

	return items.map((item) => {
		if (item.categoryAssignment !== null) {
			return item;
		}

		if (item.categoryId !== null) {
			return {
				...item,
				categoryAssignment: "manual",
				updatedAt: timestamp,
			};
		}

		const inferredCategoryId = inferShoppingCategory(item.name);

		if (inferredCategoryId === null) {
			return item;
		}

		return {
			...item,
			categoryId: inferredCategoryId,
			categoryAssignment: "automatic",
			updatedAt: timestamp,
		};
	});
}
