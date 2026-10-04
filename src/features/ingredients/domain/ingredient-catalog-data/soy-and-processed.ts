import type { IngredientCatalogEntry } from "../ingredient-catalog";
import {
	entry,
	presetsFor,
	withDefaultCategory,
} from "../ingredient-catalog-entry";
// 大豆製品・練り物（豆腐、油揚げ、納豆、豆乳、ちくわ、かまぼこ、こんにゃく）。出典と `approximate` の意味は、index.ts を参照。
export const soyAndProcessedEntries: readonly IngredientCatalogEntry[] =
	withDefaultCategory("chilled", [
		entry({
			id: "tofu-momen",
			name: "木綿豆腐",
			aliases: ["木綿豆腐", "もめん豆腐", "豆腐"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1丁", quantity: 1, unit: "丁", code: "count", per: 1 },
				{
					label: "3個パック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 3,
				},
			]),
			unitWeights: [{ unit: "丁", grams: 300, approximate: true }],
		}),
		entry({
			id: "tofu-kinu",
			name: "絹ごし豆腐",
			aliases: ["絹ごし豆腐", "絹豆腐", "絹ごし"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1丁", quantity: 1, unit: "丁", code: "count", per: 1 },
				{
					label: "3個パック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 3,
				},
			]),
			unitWeights: [{ unit: "丁", grams: 300, approximate: true }],
		}),
		entry({
			id: "fried-tofu-thin",
			name: "油揚げ",
			aliases: ["油揚げ", "薄揚げ"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "3枚入り", quantity: 1, unit: "袋", code: "bag", per: 3 },
				{ label: "5枚入り", quantity: 1, unit: "袋", code: "bag", per: 5 },
			]),
			unitWeights: [{ unit: "枚", grams: 30, approximate: true }],
		}),
		entry({
			id: "fried-tofu-thick",
			name: "厚揚げ",
			aliases: ["厚揚げ", "生揚げ"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "2枚入り", quantity: 1, unit: "パック", code: "pack", per: 2 },
			]),
			// 出典によって、135〜200g。
			unitWeights: [{ unit: "枚", grams: 150, approximate: true }],
		}),
		entry({
			id: "natto",
			name: "納豆",
			aliases: ["納豆"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{
					label: "3個パック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 3,
				},
			]),
			unitWeights: [{ unit: "パック", grams: 50, approximate: true }],
		}),
		entry({
			id: "soy-milk",
			name: "豆乳",
			aliases: ["豆乳", "無調整豆乳"],
			stockUnitCode: "ml",
			presets: presetsFor("ml", [
				{ label: "200ml", quantity: 200, unit: "ml", code: "ml", per: 1 },
				{ label: "1L", quantity: 1, unit: "L", code: "l", per: 1000 },
			]),
			categoryId: "dairy",
			// 大さじ1が15g（ユーザー提供の換算表）。
			density: { gramsPerMl: 1, approximate: true },
		}),
		entry({
			id: "chikuwa",
			name: "ちくわ",
			aliases: ["ちくわ", "竹輪"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "4本入り", quantity: 1, unit: "袋", code: "bag", per: 4 },
				{ label: "5本入り", quantity: 1, unit: "袋", code: "bag", per: 5 },
			]),
			unitWeights: [{ unit: "本", grams: 30, approximate: true }],
		}),
		entry({
			id: "kamaboko",
			name: "かまぼこ",
			aliases: ["かまぼこ", "蒲鉾"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1本", quantity: 1, unit: "本", code: "count", per: 1 },
			]),
			// 板つき1本。商品によって、100〜150g。
			unitWeights: [{ unit: "本", grams: 145, approximate: true }],
		}),
		entry({
			id: "konnyaku",
			name: "こんにゃく",
			aliases: ["こんにゃく", "コンニャク", "板こんにゃく"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1枚", quantity: 1, unit: "枚", code: "count", per: 1 },
			]),
			// 出典によって、250〜300g。
			unitWeights: [{ unit: "枚", grams: 250, approximate: true }],
		}),
		entry({
			id: "shirataki",
			name: "しらたき",
			aliases: ["しらたき", "白滝", "糸こんにゃく"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1袋", quantity: 1, unit: "袋", code: "bag", per: 1 },
			]),
			unitWeights: [{ unit: "袋", grams: 200, approximate: true }],
		}),
	]);
