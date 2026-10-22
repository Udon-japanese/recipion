import { describe, expect, it } from "vitest";

import { normalizeIngredientName } from "#/features/ingredients/domain/normalize-ingredient-name";

import {
	getShoppingItemPresets,
	inferShoppingCategory,
	shoppingItemSuggestions,
} from "./shopping-item-suggestion";

// 候補のデータ全体の整合性を検査する。食材（別名）ごとにテストを増やさず、
// 食材ごとの不一致を集めて、1つのテストで、どの食材が違うかを示す。
describe("買い物候補のデータ", () => {
	it("すべての別名から、設定された数量候補とカテゴリを取得できる", () => {
		const mismatches: string[] = [];

		for (const suggestion of shoppingItemSuggestions) {
			for (const alias of suggestion.aliases) {
				if (inferShoppingCategory(alias) !== suggestion.categoryId) {
					mismatches.push(`${alias}: カテゴリ`);
				}

				if (
					getShoppingItemPresets(alias).length !== suggestion.presets.length
				) {
					mismatches.push(`${alias}: 数量候補`);
				}
			}
		}

		expect(mismatches).toEqual([]);
	});

	it("正規化後の別名が、候補の中でも、候補をまたいでも重複していない", () => {
		const owners = new Map<string, string>();
		const duplicates: string[] = [];

		for (const suggestion of shoppingItemSuggestions) {
			for (const alias of suggestion.aliases) {
				const normalizedAlias = normalizeIngredientName(alias);
				const owner = owners.get(normalizedAlias);

				if (owner !== undefined) {
					duplicates.push(`${alias}（${owner} と ${suggestion.aliases[0]}）`);
				}

				owners.set(normalizedAlias, suggestion.aliases[0] ?? alias);
			}
		}

		expect(duplicates).toEqual([]);
	});

	it("すべての数量候補が有効な値を持つ", () => {
		const invalid: string[] = [];

		for (const suggestion of shoppingItemSuggestions) {
			for (const preset of suggestion.presets) {
				const conversion = preset.inventoryConversion;

				if (
					preset.label.length === 0 ||
					preset.quantity <= 0 ||
					preset.unitLabel.length === 0 ||
					conversion.inputUnitCode.length === 0 ||
					conversion.stockQuantityPerInputUnit <= 0
				) {
					invalid.push(`${suggestion.aliases[0]}: ${preset.label}`);
				}
			}
		}

		expect(invalid).toEqual([]);
	});
});

describe("買い物候補の正規化", () => {
	it.each(["milk", "Milk", "MILK", "mILK", "ＭｉＬＫ"])(
		"英字の大文字小文字に関係なく%sを牛乳として扱う",
		(name) => {
			expect(inferShoppingCategory(name)).toBe("dairy");
		},
	);

	it("Unicode表現と前後の空白を正規化する", () => {
		expect(inferShoppingCategory("  タマゴ  ")).toBe("eggs");
	});
});

describe("未登録の商品", () => {
	it("数量候補を返さない", () => {
		expect(getShoppingItemPresets("謎の商品")).toEqual([]);
	});

	it("カテゴリを推測しない", () => {
		expect(inferShoppingCategory("謎の商品")).toBeNull();
	});

	it("空の商品名を分類しない", () => {
		expect(inferShoppingCategory("　 ")).toBeNull();
	});
});

describe("日用品のカテゴリ判定", () => {
	it.each([
		"トイレットペーパー",
		"アルミホイル",
		"ラップ",
		"ラップ 22cm",
		"洗濯洗剤 詰め替え",
		"ジッパー付き保存袋M",
		"可燃ゴミ袋",
	])("%sを日用品に分類し、数量候補は出さない", (name) => {
		expect(inferShoppingCategory(name)).toBe("household");
		expect(getShoppingItemPresets(name)).toEqual([]);
	});
});
