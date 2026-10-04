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
			defaultTrackingMode: "exact",
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
		expect(registration.defaultTrackingMode).toBe("estimated");
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
			defaultTrackingMode: "estimated",
		});
	});

	it("未知の食材では指定された管理方式を使う", () => {
		const registration = createIngredientRegistration({
			ingredientName: "ドラゴンフルーツ",
			stockUnitCode: "g",
			stockUnitLabel: "g",
			trackingMode: "exact",
		});

		expect(registration.defaultTrackingMode).toBe("exact");
	});

	it("数量プリセットがある食材は、在庫の単位と管理方式をカタログに固定する", () => {
		const registration = createIngredientRegistration({
			ingredientName: "ヨーグルト",
			stockUnitCode: "count",
			stockUnitLabel: "個",
			trackingMode: "exact",
		});

		expect(registration.stockUnitCode).toBe("g");
		expect(registration.stockUnitLabel).toBe("g");
		expect(registration.defaultTrackingMode).toBe("estimated");
	});

	it("プリセットのない食材は、名前と別名をカタログに揃え、単位は入力に従う", () => {
		const registration = createIngredientRegistration({
			ingredientName: "ニンニク",
			stockUnitCode: "count",
			stockUnitLabel: "玉",
			trackingMode: "exact",
		});

		expect(registration.name).toBe("にんにく");
		expect(registration.stockUnitCode).toBe("count");
		expect(registration.stockUnitLabel).toBe("玉");
		expect(registration.defaultTrackingMode).toBe("exact");
		expect(registration.aliases.map((alias) => alias.name)).toEqual(
			expect.arrayContaining(["にんにく", "ニンニク", "大蒜"]),
		);
	});
});
