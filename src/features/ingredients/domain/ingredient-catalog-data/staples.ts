import type { IngredientCatalogEntry } from "../ingredient-catalog";
import { entry, withDefaultCategory } from "../ingredient-catalog-entry";
// 主食・麺・缶詰（スパゲティ、うどん、パン、ご飯、トマト缶など）。出典と `approximate` の意味は、index.ts を参照。
export const staplesEntries: readonly IngredientCatalogEntry[] =
	withDefaultCategory("staples", [
		entry({
			id: "spaghetti",
			name: "スパゲティ",
			aliases: ["スパゲティ", "スパゲッティ", "パスタ"],
			stockUnitCode: "g",
		}),
		entry({
			id: "somen",
			name: "そうめん",
			aliases: ["そうめん", "素麺"],
			stockUnitCode: "g",
			unitWeights: [{ unit: "束", grams: 50, approximate: true }],
		}),
		entry({
			id: "cooked-rice",
			name: "ご飯",
			aliases: ["ご飯", "ごはん", "白ごはん"],
			stockUnitCode: "g",
			// 茶碗1杯。
			unitWeights: [{ unit: "杯", grams: 150, approximate: true }],
		}),
		entry({
			id: "mochi",
			name: "もち",
			aliases: ["もち", "餅", "切り餅"],
			stockUnitCode: "count",
			// 出典を確認できていない（切り餅1個約50g）。
			unitWeights: [{ unit: "個", grams: 50, approximate: true }],
		}),
		entry({
			id: "bread",
			name: "食パン",
			aliases: ["食パン", "パン"],
			stockUnitCode: "count",
			categoryId: "bakery",
			// 6枚切り。8枚切りは約45g。
			unitWeights: [{ unit: "枚", grams: 60, approximate: true }],
		}),
		entry({
			id: "bun",
			name: "バンズ",
			aliases: ["バンズ", "ハンバーガー用パン"],
			stockUnitCode: "count",
			categoryId: "bakery",
			// 出典を確認できていない。
			unitWeights: [{ unit: "個", grams: 55, approximate: true }],
		}),
		entry({
			id: "boiled-udon",
			name: "ゆでうどん",
			aliases: ["ゆでうどん", "茹でうどん", "うどん"],
			stockUnitCode: "count",
			categoryId: "chilled",
			// 出典によって、200〜250g。
			unitWeights: [{ unit: "玉", grams: 250, approximate: true }],
		}),
		entry({
			id: "frozen-udon",
			name: "冷凍うどん",
			aliases: ["冷凍うどん"],
			stockUnitCode: "count",
			categoryId: "frozen",
			unitWeights: [{ unit: "玉", grams: 200, approximate: true }],
		}),
		entry({
			id: "soba",
			name: "そば",
			aliases: ["そば", "蕎麦", "乾そば"],
			stockUnitCode: "g",
			// 乾麺1束は100g（ユーザー提供の換算表）。
			unitWeights: [{ unit: "束", grams: 100, approximate: true }],
		}),
		entry({
			id: "chinese-noodles",
			name: "中華麺",
			aliases: ["中華麺", "中華めん"],
			stockUnitCode: "count",
			categoryId: "chilled",
			// 生麺1玉。
			unitWeights: [{ unit: "玉", grams: 110, approximate: true }],
		}),
		entry({
			id: "macaroni",
			name: "マカロニ",
			aliases: ["マカロニ"],
			stockUnitCode: "g",
			// 大さじ1が約8〜10g。形状でぶれる（ユーザー提供の換算表）。
			density: { gramsPerMl: 0.6, approximate: true },
		}),
		entry({
			id: "canned-tomato",
			name: "トマト缶",
			aliases: ["トマト缶"],
			stockUnitCode: "g",
			categoryId: "pantry",
			unitWeights: [{ unit: "缶", grams: 400, approximate: false }],
		}),
		entry({
			id: "cut-tomato-can",
			name: "カットトマト缶",
			aliases: ["カットトマト缶", "カットトマト"],
			stockUnitCode: "g",
			categoryId: "pantry",
			unitWeights: [{ unit: "缶", grams: 400, approximate: false }],
		}),
		entry({
			id: "whole-tomato-can",
			name: "ホールトマト缶",
			aliases: ["ホールトマト缶", "ホールトマト"],
			stockUnitCode: "g",
			categoryId: "pantry",
			unitWeights: [{ unit: "缶", grams: 400, approximate: false }],
		}),
	]);
