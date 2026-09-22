import { normalizeIngredientName } from "./normalize-ingredient-name";

export type IngredientPreset = {
	id: string;
	name: string;
	aliases: readonly string[];
	stockUnitCode: string;
	stockUnitLabel: string;
	defaultTrackingMode: "exact" | "estimated";
};

export const eggIngredientPreset = {
	id: "egg",
	name: "卵",
	aliases: ["卵", "たまご", "タマゴ", "玉子"],
	stockUnitCode: "count",
	stockUnitLabel: "個",
	defaultTrackingMode: "exact",
} as const satisfies IngredientPreset;

export const milkIngredientPreset = {
	id: "milk",
	name: "牛乳",
	aliases: ["牛乳", "ぎゅうにゅう", "ギュウニュウ", "ミルク", "milk"],
	stockUnitCode: "ml",
	stockUnitLabel: "ml",
	defaultTrackingMode: "estimated",
} as const satisfies IngredientPreset;

export const hotcakeMixIngredientPreset = {
	id: "hotcake-mix",
	name: "ホットケーキミックス",
	aliases: ["ホットケーキミックス", "ホケミ", "HM"],
	stockUnitCode: "g",
	stockUnitLabel: "g",
	defaultTrackingMode: "estimated",
} as const satisfies IngredientPreset;

export const ingredientPresets = [
	eggIngredientPreset,
	milkIngredientPreset,
	hotcakeMixIngredientPreset,
] as const satisfies readonly IngredientPreset[];

export function findIngredientPreset(
	name: string,
): IngredientPreset | undefined {
	if (name.trim().length === 0) {
		return undefined;
	}

	const normalizedName = normalizeIngredientName(name);

	return ingredientPresets.find((preset) =>
		preset.aliases.some(
			(alias) => normalizeIngredientName(alias) === normalizedName,
		),
	);
}
