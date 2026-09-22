import {
	eggIngredientPreset,
	hotcakeMixIngredientPreset,
	milkIngredientPreset,
} from "#/features/ingredients/domain/ingredient-preset";
import { normalizeIngredientName } from "#/features/ingredients/domain/normalize-ingredient-name";
import type { ShoppingCategoryId } from "./shopping-category";
import type { ShoppingItemInventoryConversion } from "./shopping-item";

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

export const shoppingItemSuggestions = [
	{
		aliases: eggIngredientPreset.aliases,
		categoryId: "eggs",
		presets: [
			{
				label: "6個",
				quantity: 6,
				unitLabel: "個",
				inventoryConversion: {
					inputUnitCode: "count",
					stockUnitCode: "count",
					stockUnitLabel: "個",
					stockQuantityPerInputUnit: 1,
					trackingMode: "exact",
				},
			},
			{
				label: "10個",
				quantity: 10,
				unitLabel: "個",
				inventoryConversion: {
					inputUnitCode: "count",
					stockUnitCode: "count",
					stockUnitLabel: "個",
					stockQuantityPerInputUnit: 1,
					trackingMode: "exact",
				},
			},
		],
	},
	{
		aliases: milkIngredientPreset.aliases,
		categoryId: "dairy",
		presets: [
			{
				label: "200ml",
				quantity: 200,
				unitLabel: "ml",
				inventoryConversion: {
					inputUnitCode: "ml",
					stockUnitCode: "ml",
					stockUnitLabel: "ml",
					stockQuantityPerInputUnit: 1,
					trackingMode: "estimated",
				},
			},
			{
				label: "500ml",
				quantity: 500,
				unitLabel: "ml",
				inventoryConversion: {
					inputUnitCode: "ml",
					stockUnitCode: "ml",
					stockUnitLabel: "ml",
					stockQuantityPerInputUnit: 1,
					trackingMode: "estimated",
				},
			},
			{
				label: "1L",
				quantity: 1,
				unitLabel: "L",
				inventoryConversion: {
					inputUnitCode: "l",
					stockUnitCode: "ml",
					stockUnitLabel: "ml",
					stockQuantityPerInputUnit: 1000,
					trackingMode: "estimated",
				},
			},
		],
	},
	{
		aliases: hotcakeMixIngredientPreset.aliases,
		categoryId: "snacks",
		presets: [
			{
				label: "150g袋",
				quantity: 1,
				unitLabel: "袋",
				inventoryConversion: {
					inputUnitCode: "bag",
					stockUnitCode: "g",
					stockUnitLabel: "g",
					stockQuantityPerInputUnit: 150,
					trackingMode: "estimated",
				},
			},
			{
				label: "200g袋",
				quantity: 1,
				unitLabel: "袋",
				inventoryConversion: {
					inputUnitCode: "bag",
					stockUnitCode: "g",
					stockUnitLabel: "g",
					stockQuantityPerInputUnit: 200,
					trackingMode: "estimated",
				},
			},
		],
	},
] satisfies readonly ShoppingItemSuggestion[];

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
