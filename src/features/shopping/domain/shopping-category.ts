export const shoppingCategories = [
	{ id: "produce", label: "野菜・果物" },
	{
		id: "chilled",
		label: "豆腐・納豆・練り物・生麺",
	},
	{ id: "household", label: "日用品" },
	{ id: "meat", label: "肉・肉加工品" },
	{ id: "seafood", label: "魚・海産物" },
	{
		id: "dairy",
		label: "牛乳・乳製品",
	},
	{ id: "eggs", label: "卵" },
	{
		id: "pantry",
		label: "調味料・乾物・缶詰・レトルト",
	},
	{
		id: "frozen",
		label: "冷凍食品・アイス",
	},
	{
		id: "snacks",
		label: "お菓子・製菓材料",
	},
	{
		id: "staples",
		label: "米・麺・粉類",
	},
	{ id: "beverages", label: "飲料・酒" },
	{ id: "deli", label: "惣菜・弁当" },
	{ id: "bakery", label: "パン" },
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
