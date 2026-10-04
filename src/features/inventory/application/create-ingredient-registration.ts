import * as v from "valibot";

import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
	type IngredientCatalogEntry,
} from "#/features/ingredients/domain/ingredient-catalog";
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

// カタログにある食材は、名前と別名をカタログに揃える（「しょうゆ」と「醤油」を、同じ食材にする）。
// 在庫の単位と管理方法は、買うときの数量プリセットがある食材（卵・牛乳など）だけ、カタログに固定する。
// 換算のプリセットと在庫の単位がずれると、数量が狂うため。それ以外は、入力された単位に従う。
function createFromCatalogEntry(
	entry: IngredientCatalogEntry,
	input: {
		stockUnitCode: InventoryUnitCode;
		stockUnitLabel: string;
		trackingMode: "exact" | "estimated";
	},
): IngredientRegistration {
	const primaryNormalizedName = normalizeIngredientName(entry.name);
	const aliasesByNormalizedName = new Map<
		string,
		IngredientAliasRegistration
	>();

	for (const alias of [entry.name, ...entry.aliases]) {
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

	const isUnitFixed = (entry.presets?.length ?? 0) > 0;

	return {
		name: formatIngredientName(entry.name),
		stockUnitCode: isUnitFixed
			? v.parse(inventoryUnitCodeSchema, entry.stockUnitCode)
			: input.stockUnitCode,
		stockUnitLabel: isUnitFixed
			? getDefaultStockUnitLabel(entry.stockUnitCode)
			: input.stockUnitLabel,
		aliases: [...aliasesByNormalizedName.values()],
		defaultTrackingMode: isUnitFixed
			? entry.defaultTrackingMode
			: input.trackingMode,
	};
}

export function createIngredientRegistration(
	input: CreateIngredientRegistrationInput,
): IngredientRegistration {
	const parsedInput = v.parse(inputSchema, input);
	const catalogEntry = findIngredientCatalogEntry(parsedInput.ingredientName);

	if (catalogEntry) {
		return createFromCatalogEntry(catalogEntry, parsedInput);
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
