import * as v from "valibot";

// 買い物メモの項目と在庫の項目で共通のカテゴリ。並びは、買い物メモの標準の売り場順。
export const itemCategories = [
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
export type ItemCategoryId = (typeof itemCategories)[number]["id"];

export function isItemCategoryId(value: string): value is ItemCategoryId {
	return itemCategories.some((category) => category.id === value);
}

export const itemCategoryIdSchema = v.custom<ItemCategoryId>(
	(input) => typeof input === "string" && isItemCategoryId(input),
	"カテゴリを確認してください",
);

export function getItemCategoryLabel(categoryId: ItemCategoryId): string {
	return (
		itemCategories.find((category) => category.id === categoryId)?.label ?? ""
	);
}

export function getItemCategoryOrder(
	categoryId: ItemCategoryId | null,
): number {
	if (categoryId === null) {
		return itemCategories.length;
	}

	const index = itemCategories.findIndex(
		(category) => category.id === categoryId,
	);

	return index === -1 ? itemCategories.length : index;
}
