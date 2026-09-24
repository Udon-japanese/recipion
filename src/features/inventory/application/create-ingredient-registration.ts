import * as v from "valibot";

import {
	findIngredientPreset,
	type IngredientPreset,
} from "#/features/ingredients/domain/ingredient-preset";
import {
	formatIngredientName,
	normalizeIngredientName,
} from "#/features/ingredients/domain/normalize-ingredient-name";
import {
	type InventoryUnitCode,
	inventoryUnitCodeSchema,
} from "../domain/inventory-unit";

const inputSchema = v.object({
	ingredientName: v.string(),
	stockUnitCode: inventoryUnitCodeSchema,
	stockUnitLabel: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "表示単位を入力してください"),
	),
	trackingMode: v.optional(v.picklist(["exact", "estimated"]), "estimated"),
});

export type CreateIngredientRegistrationInput = v.InferInput<
	typeof inputSchema
>;

export type IngredientAliasRegistration = {
	name: string;
	normalizedName: string;
	isPrimary: boolean;
};

export type IngredientRegistration = {
	name: string;
	stockUnitCode: InventoryUnitCode;
	stockUnitLabel: string;
	aliases: IngredientAliasRegistration[];
	defaultTrackingMode: "exact" | "estimated";
};

function createFromPreset(preset: IngredientPreset): IngredientRegistration {
	const primaryNormalizedName = normalizeIngredientName(preset.name);
	const aliasesByNormalizedName = new Map<
		string,
		IngredientAliasRegistration
	>();

	for (const alias of [preset.name, ...preset.aliases]) {
		const formattedName = formatIngredientName(alias);
		const normalizedName = normalizeIngredientName(formattedName);

		if (!aliasesByNormalizedName.has(normalizedName)) {
			aliasesByNormalizedName.set(normalizedName, {
				name: formattedName,
				normalizedName,
				isPrimary: normalizedName === primaryNormalizedName,
			});
		}
	}

	return {
		name: formatIngredientName(preset.name),
		stockUnitCode: v.parse(inventoryUnitCodeSchema, preset.stockUnitCode),
		stockUnitLabel: preset.stockUnitLabel,
		aliases: [...aliasesByNormalizedName.values()],
		defaultTrackingMode: preset.defaultTrackingMode,
	};
}

export function createIngredientRegistration(
	input: CreateIngredientRegistrationInput,
): IngredientRegistration {
	const parsedInput = v.parse(inputSchema, input);
	const preset = findIngredientPreset(parsedInput.ingredientName);

	if (preset) {
		return createFromPreset(preset);
	}

	const name = formatIngredientName(parsedInput.ingredientName);

	return {
		name,
		stockUnitCode: parsedInput.stockUnitCode,
		stockUnitLabel: parsedInput.stockUnitLabel,
		aliases: [
			{
				name,
				normalizedName: normalizeIngredientName(name),
				isPrimary: true,
			},
		],
		defaultTrackingMode: parsedInput.trackingMode,
	};
}
