import type { IngredientCatalogEntry } from "../ingredient-catalog";
import { entry, withDefaultCategory } from "../ingredient-catalog-entry";
// 大豆製品・練り物（豆腐、油揚げ、納豆、豆乳、ちくわ、かまぼこ、こんにゃく）。出典と `approximate` の意味は、index.ts を参照。
export const soyAndProcessedEntries: readonly IngredientCatalogEntry[] =
	withDefaultCategory("chilled", [
		entry({
			id: "tofu-momen",
			name: "木綿豆腐",
			aliases: ["木綿豆腐", "もめん豆腐", "豆腐"],
			stockUnitCode: "count",
			unitWeights: [{ unit: "丁", grams: 300, approximate: true }],
		}),
		entry({
			id: "tofu-kinu",
			name: "絹ごし豆腐",
			aliases: ["絹ごし豆腐", "絹豆腐", "絹ごし"],
			stockUnitCode: "count",
			unitWeights: [{ unit: "丁", grams: 300, approximate: true }],
		}),
		entry({
			id: "fried-tofu-thin",
			name: "油揚げ",
			aliases: ["油揚げ", "薄揚げ"],
			stockUnitCode: "count",
			unitWeights: [{ unit: "枚", grams: 30, approximate: true }],
		}),
		entry({
			id: "fried-tofu-thick",
			name: "厚揚げ",
			aliases: ["厚揚げ", "生揚げ"],
			stockUnitCode: "count",
			// 出典によって、135〜200g。
			unitWeights: [{ unit: "枚", grams: 150, approximate: true }],
		}),
		entry({
			id: "natto",
			name: "納豆",
			aliases: ["納豆"],
			stockUnitCode: "count",
			unitWeights: [{ unit: "パック", grams: 50, approximate: true }],
		}),
		entry({
			id: "soy-milk",
			name: "豆乳",
			aliases: ["豆乳", "無調整豆乳"],
			stockUnitCode: "ml",
			categoryId: "dairy",
			// 大さじ1が15g（ユーザー提供の換算表）。
			density: { gramsPerMl: 1, approximate: true },
		}),
		entry({
			id: "chikuwa",
			name: "ちくわ",
			aliases: ["ちくわ", "竹輪"],
			stockUnitCode: "count",
			unitWeights: [{ unit: "本", grams: 30, approximate: true }],
		}),
		entry({
			id: "kamaboko",
			name: "かまぼこ",
			aliases: ["かまぼこ", "蒲鉾"],
			stockUnitCode: "count",
			// 板つき1本。商品によって、100〜150g。
			unitWeights: [{ unit: "本", grams: 145, approximate: true }],
		}),
		entry({
			id: "konnyaku",
			name: "こんにゃく",
			aliases: ["こんにゃく", "コンニャク", "板こんにゃく"],
			stockUnitCode: "count",
			// 出典によって、250〜300g。
			unitWeights: [{ unit: "枚", grams: 250, approximate: true }],
		}),
		entry({
			id: "shirataki",
			name: "しらたき",
			aliases: ["しらたき", "白滝", "糸こんにゃく"],
			stockUnitCode: "count",
			unitWeights: [{ unit: "袋", grams: 200, approximate: true }],
		}),
	]);
