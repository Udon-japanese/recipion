import { describe, expect, it } from "vitest";
import {
	canLinkToRecipe,
	parseRecipeVisibility,
	type RecipeVisibility,
} from "./recipe-link-permission";

describe("canLinkToRecipe", () => {
	it("自分のレシピは、公開範囲に関わらず、リンクできる。他人のレシピは、全体公開のものだけ", () => {
		const cases: [string, RecipeVisibility, boolean][] = [
			["me", "private", true],
			["me", "unlisted", true],
			["me", "public", true],
			["other", "private", false],
			["other", "unlisted", false],
			["other", "public", true],
		];
		const actual = cases.map(([ownerUserId, visibility]) =>
			canLinkToRecipe("me", { ownerUserId, visibility }),
		);

		expect(actual).toEqual(cases.map(([, , expected]) => expected));
	});
});

describe("parseRecipeVisibility", () => {
	it("知らない値は、誤って公開しないよう、非公開として扱う", () => {
		expect(parseRecipeVisibility("public")).toBe("public");
		expect(parseRecipeVisibility("unlisted")).toBe("unlisted");
		expect(parseRecipeVisibility("private")).toBe("private");
		expect(parseRecipeVisibility("anything")).toBe("private");
		expect(parseRecipeVisibility("")).toBe("private");
	});
});
