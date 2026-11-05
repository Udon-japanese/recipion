import { describe, expect, it } from "vitest";
import { buildDictionary } from "#/test/builders/build-ingredient-dictionary";
import { searchIngredientNames } from "./search-ingredient-names";

const dictionary = buildDictionary([
	{ name: "マイだし", aliases: ["うちのだし"] },
	{ name: "卵", aliases: ["たまご", "タマ"] },
]);

describe("searchIngredientNames", () => {
	it("自分の材料（カタログにない）を、印つきで候補に出す。呼び名で打っても、代表の名前を出す", () => {
		expect(searchIngredientNames("うちの", dictionary)).toEqual([
			expect.objectContaining({
				name: "マイだし",
				isOwn: true,
				entry: undefined,
			}),
		]);
	});

	it("辞書の食材がカタログの食材なら、カタログの候補として1つだけ出す（自分の呼び名でも当たる）", () => {
		const suggestions = searchIngredientNames("タマ", dictionary);

		expect(
			suggestions.filter((suggestion) => suggestion.name === "卵"),
		).toEqual([
			expect.objectContaining({
				isOwn: false,
				entry: expect.objectContaining({ name: "卵" }),
			}),
		]);
	});

	it("辞書がなければ、カタログだけ（今までどおり）", () => {
		expect(searchIngredientNames("うちの")).toEqual([]);
		expect(
			searchIngredientNames("とまと").map((suggestion) => suggestion.name),
		).toContain("トマト");
	});

	it("空の入力は、何も出さない", () => {
		expect(searchIngredientNames("", dictionary)).toEqual([]);
	});
});
