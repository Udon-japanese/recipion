import { ingredientCatalogEntries } from "#/features/ingredients/domain/ingredient-catalog";
import { normalizeIngredientName } from "#/features/ingredients/domain/normalize-ingredient-name";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import { householdItemNames } from "./household-item-names";
import type { ShoppingCategoryId } from "./shopping-category";
import type { ShoppingItemInventoryConversion } from "./shopping-item";

export type ShoppingItemPresetSelection = {
	quantity: string;
	unitLabel: string;
	inventoryConversion: ShoppingItemInventoryConversion | null;
};

export function isShoppingItemPresetSelected(
	preset: ShoppingItemPreset,
	selection: ShoppingItemPresetSelection,
): boolean {
	const conversion = selection.inventoryConversion;

	return (
		parseQuantityInput(selection.quantity) === preset.quantity &&
		selection.unitLabel === preset.unitLabel &&
		conversion?.inputUnitCode === preset.inventoryConversion.inputUnitCode &&
		conversion.stockUnitCode === preset.inventoryConversion.stockUnitCode &&
		conversion.stockQuantityPerInputUnit ===
			preset.inventoryConversion.stockQuantityPerInputUnit
	);
}

export type ShoppingItemPreset = {
	label: string;
	quantity: number;
	unitLabel: string;
	inventoryConversion: ShoppingItemInventoryConversion;
};

export type ShoppingItemSuggestion = {
	aliases: readonly string[];
	categoryId: ShoppingCategoryId;
	presets: readonly ShoppingItemPreset[];
};

function uniqueByNormalizedName(names: readonly string[]): string[] {
	const uniqueNames = new Map<string, string>();

	for (const name of names) {
		const normalizedName = normalizeIngredientName(name);

		if (!uniqueNames.has(normalizedName)) {
			uniqueNames.set(normalizedName, name);
		}
	}

	return [...uniqueNames.values()];
}

// 買い物メモの候補（カテゴリの自動判定と、よく使う数量）。食材は、食材カタログから作る
// （在庫の登録と同じデータ）。日用品だけは、カタログにない。
export const shoppingItemSuggestions: readonly ShoppingItemSuggestion[] = [
	...ingredientCatalogEntries.flatMap((entry) =>
		entry.categoryId
			? [
					{
						aliases: uniqueByNormalizedName([entry.name, ...entry.aliases]),
						categoryId: entry.categoryId,
						presets: entry.presets ?? [],
					},
				]
			: [],
	),
	{
		// 食材ではない日用品。カテゴリの自動判定だけに使い、数量候補はない。
		aliases: householdItemNames,
		categoryId: "household",
		presets: [],
	},
];

function normalizeItemName(itemName: string): string {
	// バリデーションエラーを回避
	if (itemName.trim().length === 0) {
		return "";
	}

	return normalizeIngredientName(itemName);
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
