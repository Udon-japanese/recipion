import type { IngredientCatalogEntry } from "../ingredient-catalog";
import {
	entry,
	presetsFor,
	withDefaultCategory,
} from "../ingredient-catalog-entry";
// 乾物・海藻・ごま・海苔。出典と `approximate` の意味は、index.ts を参照。
export const driedGoodsEntries: readonly IngredientCatalogEntry[] =
	withDefaultCategory("pantry", [
		entry({
			id: "nori",
			name: "海苔",
			aliases: ["海苔", "のり", "焼き海苔"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "10枚入り", quantity: 1, unit: "袋", code: "bag", per: 10 },
			]),
			// 全形1枚は約3g。
			unitWeights: [{ unit: "枚", grams: 3, approximate: false }],
		}),
		entry({
			id: "bonito-flakes",
			name: "かつお節",
			aliases: ["かつお節", "かつおぶし", "鰹節", "削り節"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "小分け5袋(15g)",
					quantity: 1,
					unit: "袋",
					code: "bag",
					per: 15,
				},
			]),
			// 小分けパック1袋が約2.5〜3g。大さじ1は約1〜1.5g（ユーザー提供の換算表）。
			unitWeights: [{ unit: "パック", grams: 3, approximate: true }],
			density: { gramsPerMl: 0.08, approximate: true },
		}),
		entry({
			id: "dried-wakame",
			name: "乾燥わかめ",
			aliases: ["乾燥わかめ", "カットわかめ", "わかめ"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "20g袋", quantity: 1, unit: "袋", code: "bag", per: 20 },
			]),
			// 大さじ1が約3g。水で戻すと約10倍（ユーザー提供の換算表）。
			density: { gramsPerMl: 0.2, approximate: true },
		}),
		entry({
			id: "kombu",
			name: "昆布",
			aliases: ["昆布", "こんぶ", "だし昆布"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "50g袋", quantity: 1, unit: "袋", code: "bag", per: 50 },
			]),
			// 10cm角1枚が約10g（ユーザー提供の換算表）。
			unitWeights: [{ unit: "枚", grams: 10, approximate: true }],
		}),
		entry({
			id: "harusame",
			name: "春雨",
			aliases: ["春雨", "はるさめ"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "100g袋", quantity: 1, unit: "袋", code: "bag", per: 100 },
			]),
		}),
		entry({
			id: "dried-hijiki",
			name: "乾燥ひじき",
			aliases: ["乾燥ひじき", "ひじき"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "20g袋", quantity: 1, unit: "袋", code: "bag", per: 20 },
			]),
			// 大さじ1が約5g。水で戻すと約7〜8倍（ユーザー提供の換算表）。
			density: { gramsPerMl: 0.33, approximate: true },
		}),
		entry({
			id: "kiriboshi-daikon",
			name: "切り干し大根",
			aliases: ["切り干し大根", "切干大根", "切り干し"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "30g袋", quantity: 1, unit: "袋", code: "bag", per: 30 },
			]),
			// 大さじ1が約3〜4g（ユーザー提供の換算表）。「ひとつかみ」は約10〜15g。
			density: { gramsPerMl: 0.23, approximate: true },
		}),
		entry({
			id: "white-sesame",
			name: "白ごま",
			aliases: ["白ごま", "白胡麻", "いりごま", "ごま"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "60g袋", quantity: 1, unit: "袋", code: "bag", per: 60 },
			]),
			density: { gramsPerMl: 0.6, approximate: false },
		}),
		entry({
			id: "black-sesame",
			name: "黒ごま",
			aliases: ["黒ごま", "黒胡麻"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "60g袋", quantity: 1, unit: "袋", code: "bag", per: 60 },
			]),
			// 白ごまの値を仮置きしている。
			density: { gramsPerMl: 0.6, approximate: true },
		}),
	]);
