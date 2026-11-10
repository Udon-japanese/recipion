import { describe, expect, it } from "vitest";
import { normalizeIngredientName } from "#/features/ingredients/domain/normalize-ingredient-name";
import { madeRecipeAliasKey } from "#/features/inventory/domain/made-recipe-ingredient";
import { buildBackupInventoryItem } from "#/test/builders/build-backup";
import { planInventoryReplace } from "./plan-inventory-replace";

function createIds() {
	let sequence = 0;

	return () => {
		sequence += 1;

		return `id-${sequence}`;
	};
}

describe("planInventoryReplace", () => {
	it("今ある食材は別名で合わせて単位・初期値を直し、ない食材だけ作る", () => {
		const plan = planInventoryReplace(
			[
				buildBackupInventoryItem({ name: "玉子", defaultStorage: "room" }),
				buildBackupInventoryItem({
					name: "自家製ジャム",
					stockUnitCode: "g",
					stockUnitLabel: "g",
				}),
			],
			{
				ingredientIdByAlias: new Map([
					[normalizeIngredientName("たまご"), "egg"],
				]),
				recipeIdByPublicId: new Map(),
			},
			createIds(),
		);

		expect(plan.updateIngredients).toEqual([
			{
				id: "egg",
				stockUnitCode: "count",
				stockUnitLabel: "個",
				defaultExpiryKind: null,
				defaultStorage: "room",
			},
		]);
		expect(plan.createIngredients.map((row) => row.name)).toEqual([
			"自家製ジャム",
		]);
		expect(plan.items.map((row) => row.ingredientId)).toEqual([
			"egg",
			plan.createIngredients[0]?.id,
		]);
		expect(plan.lots).toHaveLength(2);
	});

	it("同じ食材に当たる品目は1つにまとめ、ロットを足す", () => {
		const plan = planInventoryReplace(
			[
				buildBackupInventoryItem({ name: "卵" }),
				buildBackupInventoryItem({ name: "たまご" }),
			],
			{ ingredientIdByAlias: new Map(), recipeIdByPublicId: new Map() },
			createIds(),
		);

		expect(plan.createIngredients).toHaveLength(1);
		expect(plan.items).toHaveLength(1);
		expect(plan.lots.map((lot) => lot.inventoryItemId)).toEqual([
			plan.items[0]?.id,
			plan.items[0]?.id,
		]);
	});

	it("作り置きは、元のレシピがあればそのできあがりに、なければふつうの食材にする", () => {
		const madeItem = buildBackupInventoryItem({
			name: "ミートソース",
			stockUnitLabel: "回分",
			sourceRecipePublicId: "meat-sauce",
		});
		const withRecipe = planInventoryReplace(
			[madeItem],
			{
				ingredientIdByAlias: new Map(),
				recipeIdByPublicId: new Map([["meat-sauce", "recipe-1"]]),
			},
			createIds(),
		);
		const withoutRecipe = planInventoryReplace(
			[madeItem],
			{ ingredientIdByAlias: new Map(), recipeIdByPublicId: new Map() },
			createIds(),
		);

		expect(withRecipe.items[0]).toMatchObject({
			sourceRecipeId: "recipe-1",
			trackingMode: "exact",
		});
		expect(withRecipe.createIngredients[0]?.aliases).toEqual([
			{
				name: "ミートソース",
				normalizedName: madeRecipeAliasKey("meat-sauce"),
				isPrimary: true,
			},
		]);
		expect(withoutRecipe.items[0]?.sourceRecipeId).toBeNull();
		expect(withoutRecipe.createIngredients[0]?.aliases[0]?.normalizedName).toBe(
			normalizeIngredientName("ミートソース"),
		);
	});

	it("「有無だけ」のロットは、数量を1にする", () => {
		const plan = planInventoryReplace(
			[
				buildBackupInventoryItem({
					name: "塩",
					stockUnitCode: "g",
					stockUnitLabel: "g",
					trackingMode: "presence",
					lots: [
						{
							quantity: 500,
							acquiredOn: "2026-10-01",
							storage: null,
							expiresOn: null,
							expiryKind: null,
							expirySource: null,
							purchaseUnit: null,
						},
					],
				}),
			],
			{ ingredientIdByAlias: new Map(), recipeIdByPublicId: new Map() },
			createIds(),
		);

		expect(plan.lots[0]?.quantity).toBe(1);
	});
});
