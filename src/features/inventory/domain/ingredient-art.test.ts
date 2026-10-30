import { describe, expect, it } from "vitest";
import { findDishPart } from "#/features/dish-art/domain/dish-part";
import { ingredientCatalogEntries } from "#/features/ingredients/domain/ingredient-catalog";
import {
	ingredientArtCatalogIds,
	ingredientArtPartIds,
	resolveIngredientArt,
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
