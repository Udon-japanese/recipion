import { inferItemCategory } from "#/features/item-category/domain/infer-item-category";
import type { ShoppingItem } from "./shopping-item";

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

		const inferredCategoryId = inferItemCategory(item.name);

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
