import type { ShoppingCategoryId } from "./shopping-category";

export type ShoppingItemPreset = {
	quantity: number;
	unitLabel: string;
};

type ShoppingItemSuggestion = {
	aliases: readonly string[];
	categoryId: ShoppingCategoryId;
	presets: readonly ShoppingItemPreset[];
};

const shoppingItemSuggestions = [
	{
		aliases: ["卵", "たまご", "タマゴ", "玉子"],
		categoryId: "eggs",
		presets: [
			{ quantity: 6, unitLabel: "個" },
			{ quantity: 10, unitLabel: "個" },
		],
	},
] satisfies readonly ShoppingItemSuggestion[];

function normalizeItemName(itemName: string): string {
	return itemName.trim().normalize("NFKC");
}

function findShoppingItemSuggestion(
	itemName: string,
): ShoppingItemSuggestion | undefined {
	const normalizedName = normalizeItemName(itemName);

	return shoppingItemSuggestions.find((suggestion) =>
		suggestion.aliases.some(
			(alias) => normalizeItemName(alias) === normalizedName,
		),
	);
}

export function getShoppingItemPresets(
	itemName: string,
): readonly ShoppingItemPreset[] {
	return findShoppingItemSuggestion(itemName)?.presets ?? [];
}

export function inferShoppingCategory(
	itemName: string,
): ShoppingCategoryId | null {
	return findShoppingItemSuggestion(itemName)?.categoryId ?? null;
}
