import { describe, expect, it } from "vitest";
import { createIngredientRegistration } from "./create-ingredient-registration";

describe("createIngredientRegistration", () => {
	it("卵の別名をまとめた登録情報を作る", () => {
		const registration = createIngredientRegistration({
			ingredientName: "たまご",
			stockUnitCode: "g",
			stockUnitLabel: "g",
		});

		expect(registration).toEqual({
			name: "卵",
			stockUnitCode: "count",
			stockUnitLabel: "個",
			aliases: [
				{
					name: "卵",
					normalizedName: "卵",
					isPrimary: true,
				},
				{
					name: "たまご",
					normalizedName: "たまご",
					isPrimary: false,
				},
				{
					name: "タマゴ",
					normalizedName: "タマゴ",
					isPrimary: false,
				},
				{
					name: "玉子",
					normalizedName: "玉子",
					isPrimary: false,
				},
			],
		});
	});

	it("正規化後に同じ別名を重複登録しない", () => {
		const registration = createIngredientRegistration({
			ingredientName: "MILK",
			stockUnitCode: "count",
			stockUnitLabel: "本",
		});

		const normalizedNames = registration.aliases.map(
			(alias) => alias.normalizedName,
		);

		expect(normalizedNames).toEqual([
			"牛乳",
			"ぎゅうにゅう",
			"ギュウニュウ",
			"ミルク",
			"milk",
		]);
	});

	it("未知の食材は入力名を主別名として登録する", () => {
		expect(
			createIngredientRegistration({
				ingredientName: "  ミニ　トマト  ",
				stockUnitCode: "g",
				stockUnitLabel: "g",
			}),
		).toEqual({
			name: "ミニ トマト",
			stockUnitCode: "g",
			stockUnitLabel: "g",
			aliases: [
				{
					name: "ミニ トマト",
					normalizedName: "ミニ トマト",
					isPrimary: true,
				},
			],
		});
	});
});
