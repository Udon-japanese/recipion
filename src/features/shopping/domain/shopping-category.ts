export const shoppingCategories = [
	{ id: "produce", label: "野菜・果物" },
	{ id: "seafood", label: "魚・海産物" },
	{ id: "meat", label: "肉" },
	{ id: "dairy", label: "乳製品" },
	{ id: "eggs", label: "卵" },
	{ id: "tofu-noodles", label: "豆腐・麺・練り物" },
	{ id: "bakery", label: "パン" },
	{ id: "pantry", label: "調味料・乾物・缶詰" },
	{ id: "frozen", label: "冷凍食品" },
	{ id: "beverages", label: "飲料" },
	{ id: "household", label: "日用品" },
	{ id: "other", label: "その他" },
] as const;

export type ShoppingCategoryId = (typeof shoppingCategories)[number]["id"];

export function isShoppingCategoryId(
	value: string,
): value is ShoppingCategoryId {
	return shoppingCategories.some((category) => category.id === value);
}

export function getShoppingCategoryOrder(
	categoryId: ShoppingCategoryId | null,
): number {
	if (categoryId === null) {
		return shoppingCategories.length;
	}

	const index = shoppingCategories.findIndex(
		(category) => category.id === categoryId,
	);

	return index === -1 ? shoppingCategories.length : index;
}
