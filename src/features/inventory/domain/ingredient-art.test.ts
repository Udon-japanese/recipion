import { describe, expect, it } from "vitest";
import { findDishPart } from "#/features/dish-art/domain/dish-part";
import { pickDishPlaceholder } from "#/features/dish-art/domain/dish-placeholder";
import { ingredientCatalogEntries } from "#/features/ingredients/domain/ingredient-catalog";
import {
	ingredientArtCatalogIds,
	ingredientArtPartIds,
	resolveIngredientArt,
	resolveInventoryItemArt,
} from "./ingredient-art";

describe("ingredient-art", () => {
	it("表のキーは、すべてカタログの食材 ID", () => {
		const ids = new Set(ingredientCatalogEntries.map((entry) => entry.id));

		expect(ingredientArtCatalogIds.filter((id) => !ids.has(id))).toEqual([]);
	});

	it("使う部品は、すべて存在する", () => {
		expect(
			ingredientArtPartIds.filter((id) => findDishPart(id) === undefined),
		).toEqual([]);
	});

	it("表にないカタログの食材は、少数にとどめる（増えたら、表へ足す）", () => {
		const missing = ingredientCatalogEntries.filter(
			(entry) => !ingredientArtCatalogIds.includes(entry.id),
		);

		expect(missing.length).toBeLessThanOrEqual(10);
	});

	it("別名でも、同じ絵になる", () => {
		expect(resolveIngredientArt("たまねぎ")).toEqual(
			resolveIngredientArt("玉ねぎ"),
		);
	});

	it("名前の一部が当たるだけでは、別の食材の絵にならない", () => {
		const gyoza = resolveIngredientArt("餃子の皮", "staples");

		expect(gyoza.map((placement) => placement.partId)).not.toContain("gyoza");
	});

	it("カタログにない名前は、渡したカテゴリ（なければ、その他）の寄せ集め", () => {
		expect(resolveIngredientArt("謎の食材", "frozen")).toHaveLength(3);
		expect(resolveIngredientArt("謎の食材")[0]?.partId).toBe("umeboshi");
	});

	it("色の差し替えは、色の形式で書かれている", () => {
		const tints = resolveIngredientArt("醤油").map((p) => p.tint);

		expect(tints[0]).toMatch(/^#[0-9a-f]{6}$/i);
	});
});

describe("resolveInventoryItemArt", () => {
	const cover = [{ partId: "curry", x: 50, y: 50 }];
	const userArt = [{ partId: "raw-egg", x: 40, y: 60, scale: 0.8 }];

	it.each([
		{
			title: "作り置き（レシピに絵あり）→ レシピの絵",
			item: {
				name: "カレー",
				sourceRecipePublicId: "curry-id",
				sourceRecipeCover: cover,
			},
			expected: cover,
		},
		{
			title: "作り置き（レシピに絵なし）→ レシピと同じ、れしぽよの絵",
			item: { name: "カレー", sourceRecipePublicId: "curry-id" },
			expected: pickDishPlaceholder("curry-id"),
		},
		{
			title: "ふつうの食材 → 名前から決めた絵",
			item: { name: "卵" },
			expected: resolveIngredientArt("卵"),
		},
		{
			title: "自分で組み立てた絵 → それを使う（作り置きのレシピの絵より先）",
			item: {
				name: "カレー",
				art: userArt,
				sourceRecipePublicId: "curry-id",
				sourceRecipeCover: cover,
			},
			expected: userArt,
		},
		{
			title: "組み立てた絵が null → 名前から決めた絵",
			item: { name: "卵", art: null },
			expected: resolveIngredientArt("卵"),
		},
	])("$title", ({ item, expected }) => {
		expect(resolveInventoryItemArt(item)).toEqual(expected);
	});
});
