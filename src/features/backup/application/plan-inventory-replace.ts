import type { DishPlacement } from "#/features/dish-art/domain/dish-cover";
import type { IngredientAliasRegistration } from "#/features/inventory/application/create-ingredient-registration";
import { createIngredientRegistration } from "#/features/inventory/application/create-ingredient-registration";
import type {
	InventoryExpiryKind,
	InventoryStorage,
} from "#/features/inventory/domain/inventory-lot";
import {
	type InventoryTrackingMode,
	presenceLotQuantity,
} from "#/features/inventory/domain/inventory-tracking-mode";
import type { InventoryUnitCode } from "#/features/inventory/domain/inventory-unit";
import {
	madeRecipeAliasKey,
	madeRecipeUnitLabel,
} from "#/features/inventory/domain/made-recipe-ingredient";
import type { BackupInventoryItem, BackupLot } from "../domain/backup-file";

type CreateId = () => string;

type IngredientSettings = {
	stockUnitCode: InventoryUnitCode;
	stockUnitLabel: string;
	defaultExpiryKind: InventoryExpiryKind | null;
	defaultStorage: InventoryStorage | null;
};

export type InventoryReplacePlan = {
	// 新しく作る食材（別名つき）。
	createIngredients: (IngredientSettings & {
		id: string;
		name: string;
		aliases: IngredientAliasRegistration[];
	})[];
	// 今ある食材の、単位と初期値を、ファイルに合わせる。
	updateIngredients: (IngredientSettings & { id: string })[];
	items: {
		id: string;
		ingredientId: string;
		trackingMode: InventoryTrackingMode;
		displayName: string | null;
		art: DishPlacement[] | null;
		sourceRecipeId: string | null;
	}[];
	lots: (BackupLot & { id: string; inventoryItemId: string })[];
};

export type InventoryReplaceContext = {
	// 今ある食材の別名（正規化した名前 → 食材の ID）。
	ingredientIdByAlias: ReadonlyMap<string, string>;
	// 自分のレシピ（公開 ID → レシピの ID）。作り置きの元のレシピを探す。
	recipeIdByPublicId: ReadonlyMap<string, string>;
};

// 在庫を、ファイルの内容に置き換えるための、作る行の一覧（今の在庫は、別に消す）。
// 食材は名前で今ある食材と合わせ、ないものだけ作る。同じ食材に当たる品目が2つあれば、ロットを1つ目にまとめる。
// 作り置きは、元のレシピが自分のレシピにあれば、そのレシピのできあがりとして入れ、なければ、ふつうの食材として入れる。
export function planInventoryReplace(
	items: readonly BackupInventoryItem[],
	context: InventoryReplaceContext,
	createId: CreateId = () => crypto.randomUUID(),
): InventoryReplacePlan {
	const plan: InventoryReplacePlan = {
		createIngredients: [],
		updateIngredients: [],
		items: [],
		lots: [],
	};
	const ingredientIdByAlias = new Map(context.ingredientIdByAlias);
	const itemIdByIngredientId = new Map<string, string>();
	const updatedIngredientIds = new Set<string>();

	for (const item of items) {
		const sourceRecipeId =
			item.sourceRecipePublicId === null
				? undefined
				: context.recipeIdByPublicId.get(item.sourceRecipePublicId);
		const isMadeRecipe =
			item.sourceRecipePublicId !== null && sourceRecipeId !== undefined;
		const settings: IngredientSettings = {
			stockUnitCode: isMadeRecipe ? "count" : item.stockUnitCode,
			stockUnitLabel: isMadeRecipe ? madeRecipeUnitLabel : item.stockUnitLabel,
			defaultExpiryKind: item.defaultExpiryKind,
			defaultStorage: item.defaultStorage,
		};
		const registration =
			isMadeRecipe && item.sourceRecipePublicId !== null
				? {
						name: item.name,
						aliases: [
							{
								name: item.name,
								normalizedName: madeRecipeAliasKey(item.sourceRecipePublicId),
								isPrimary: true,
							},
						],
					}
				: createIngredientRegistration({
						ingredientName: item.name,
						stockUnitCode: item.stockUnitCode,
						stockUnitLabel: item.stockUnitLabel,
						trackingMode: item.trackingMode,
					});

		let ingredientId = registration.aliases
			.map((alias) => ingredientIdByAlias.get(alias.normalizedName))
			.find((id) => id !== undefined);

		if (ingredientId === undefined) {
			const createdId = createId();

			ingredientId = createdId;
			plan.createIngredients.push({
				id: createdId,
				name: registration.name,
				aliases: registration.aliases,
				...settings,
			});

			for (const alias of registration.aliases) {
				ingredientIdByAlias.set(alias.normalizedName, createdId);
			}
		} else if (!updatedIngredientIds.has(ingredientId)) {
			updatedIngredientIds.add(ingredientId);
			plan.updateIngredients.push({ id: ingredientId, ...settings });
		}

		let inventoryItemId = itemIdByIngredientId.get(ingredientId);

		if (inventoryItemId === undefined) {
			const createdItemId = createId();

			inventoryItemId = createdItemId;
			itemIdByIngredientId.set(ingredientId, createdItemId);
			plan.items.push({
				id: createdItemId,
				ingredientId,
				trackingMode: isMadeRecipe ? "exact" : item.trackingMode,
				displayName: item.displayName,
				art: item.art,
				sourceRecipeId: sourceRecipeId ?? null,
			});
		}

		const itemId = inventoryItemId;

		for (const lot of item.lots) {
			plan.lots.push({
				...lot,
				// 「有無だけ」のロットの数量は、ある＝1 に固定している。
				quantity:
					item.trackingMode === "presence" && !isMadeRecipe
						? presenceLotQuantity
						: lot.quantity,
				id: createId(),
				inventoryItemId: itemId,
			});
		}
	}

	return plan;
}
