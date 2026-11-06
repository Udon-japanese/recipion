import { describe, expect, it } from "vitest";
import { buildDictionary } from "#/test/builders/build-ingredient-dictionary";
import { findSimilarIngredients } from "./find-similar-ingredients";

const dictionary = buildDictionary([
	{ name: "マイだし", aliases: ["うちのだし"] },
]);

function names(name: string) {
	return findSimilarIngredients(name, dictionary).map(
		(candidate) => candidate.name,
	);
}

describe("findSimilarIngredients", () => {
	it.each([
		{
			title: "どちらかが含む（カタログ）",
			name: "鶏むね",
			expected: "鶏むね肉",
		},
		{
			title: "1文字違い（カタログの読み）",
			name: "たまねき",
			expected: "玉ねぎ",
		},
		{
			title: "どちらかが含む（自分の材料の呼び名）",
			name: "うちのだし汁",
			expected: "マイだし",
		},
	])("$title：$name → $expected", ({ name, expected }) => {
		expect(names(name)).toContain(expected);
	});

	it.each([
		{ title: "カタログにある名前（別名・読み・全角半角も）", name: "ｷｬﾍﾞﾂ" },
		{ title: "自分の辞書にある名前（呼び名）", name: "うちのだし" },
		{ title: "空", name: "  " },
		{ title: "1文字は「含む」にしない", name: "鶏" },
	])("出さない：$title", ({ name }) => {
		expect(names(name)).toEqual([]);
	});

	it("多くて3件。近い順で、同じ近さなら自分の材料を先に出す", () => {
		const own = buildDictionary([{ name: "うちのトマトソース" }]);
		const found = findSimilarIngredients("トマトソース自家製", own);

		expect(found.length).toBeLessThanOrEqual(3);
		expect(findSimilarIngredients("うちのトマト", own)[0]).toEqual({
			name: "うちのトマトソース",
			isOwn: true,
		});
	});
});
