import type { IngredientCatalogEntry } from "../ingredient-catalog";
import { entry, withDefaultCategory } from "../ingredient-catalog-entry";
// 卵・乳製品（牛乳の種類違い、チーズ、バター、生クリーム）。出典と `approximate` の意味は、index.ts を参照。
export const dairyAndEggsEntries: readonly IngredientCatalogEntry[] =
	withDefaultCategory("dairy", [
		entry({
			id: "egg",
			name: "卵",
			aliases: ["卵", "たまご", "タマゴ", "玉子"],
			stockUnitCode: "count",
			categoryId: "eggs",
			defaultTrackingMode: "exact",
			unitWeights: [{ unit: "個", size: "中", grams: 50, approximate: true }],
			presets: [
				{
					label: "6個",
					quantity: 6,
					unitLabel: "個",
					inventoryConversion: {
						inputUnitCode: "count",
						stockUnitCode: "count",
						stockUnitLabel: "個",
						stockQuantityPerInputUnit: 1,
						trackingMode: "exact",
					},
				},
				{
					label: "10個",
					quantity: 10,
					unitLabel: "個",
					inventoryConversion: {
						inputUnitCode: "count",
						stockUnitCode: "count",
						stockUnitLabel: "個",
						stockQuantityPerInputUnit: 1,
						trackingMode: "exact",
					},
				},
			],
		}),
		entry({
			id: "hot-spring-egg",
			name: "温泉卵",
			aliases: ["温泉卵", "温玉"],
			stockUnitCode: "count",
			categoryId: "eggs",
			unitWeights: [{ unit: "個", grams: 50, approximate: true }],
		}),
		entry({
			id: "quail-egg",
			name: "うずらの卵",
			aliases: ["うずらの卵", "うずら卵", "うずらたまご"],
			stockUnitCode: "count",
			categoryId: "eggs",
			// 約10g。鶏卵の約6分の1（ユーザー提供の換算表）。
			unitWeights: [{ unit: "個", grams: 10, approximate: true }],
		}),
		entry({
			id: "milk",
			name: "牛乳",
			aliases: ["牛乳", "ぎゅうにゅう", "ギュウニュウ", "ミルク", "milk"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 1.03, approximate: false },
			presets: [
				{
					label: "200ml",
					quantity: 200,
					unitLabel: "ml",
					inventoryConversion: {
						inputUnitCode: "ml",
						stockUnitCode: "ml",
						stockUnitLabel: "ml",
						stockQuantityPerInputUnit: 1,
						trackingMode: "estimated",
					},
				},
				{
					label: "500ml",
					quantity: 500,
					unitLabel: "ml",
					inventoryConversion: {
						inputUnitCode: "ml",
						stockUnitCode: "ml",
						stockUnitLabel: "ml",
						stockQuantityPerInputUnit: 1,
						trackingMode: "estimated",
					},
				},
				{
					label: "1L",
					quantity: 1,
					unitLabel: "L",
					inventoryConversion: {
						inputUnitCode: "l",
						stockUnitCode: "ml",
						stockUnitLabel: "ml",
						stockQuantityPerInputUnit: 1000,
						trackingMode: "estimated",
					},
				},
			],
		}),
		entry({
			id: "low-fat-milk",
			name: "低脂肪乳",
			aliases: ["低脂肪乳", "低脂肪牛乳"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 1.03, approximate: true },
		}),
		entry({
			id: "nonfat-milk",
			name: "無脂肪乳",
			aliases: ["無脂肪乳", "無脂肪牛乳"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 1.03, approximate: true },
		}),
		entry({
			id: "whole-milk",
			name: "成分無調整牛乳",
			aliases: ["成分無調整牛乳", "無調整牛乳"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 1.03, approximate: false },
		}),
		entry({
			id: "yogurt",
			name: "ヨーグルト",
			aliases: ["ヨーグルト", "プレーンヨーグルト"],
			stockUnitCode: "g",
			density: { gramsPerMl: 1, approximate: false },
		}),
		entry({
			id: "sliced-cheese",
			name: "スライスチーズ",
			aliases: ["スライスチーズ", "チーズ"],
			stockUnitCode: "count",
			unitWeights: [{ unit: "枚", grams: 18, approximate: true }],
		}),
		entry({
			id: "parmesan-powder",
			name: "粉チーズ",
			aliases: ["粉チーズ", "パルメザンチーズ"],
			stockUnitCode: "g",
			density: { gramsPerMl: 0.4, approximate: false },
		}),
		entry({
			id: "cream-cheese",
			name: "クリームチーズ",
			aliases: ["クリームチーズ"],
			stockUnitCode: "g",
			// 個包装の1個。商品によって、15〜18g（ユーザー提供の換算表）。
			unitWeights: [{ unit: "個", grams: 16, approximate: true }],
		}),
		entry({
			id: "butter",
			name: "バター",
			aliases: ["バター", "有塩バター", "無塩バター"],
			stockUnitCode: "g",
			density: { gramsPerMl: 0.8, approximate: false },
		}),
		entry({
			id: "fresh-cream",
			name: "生クリーム",
			aliases: ["生クリーム", "ホイップクリーム", "ホイップ"],
			stockUnitCode: "ml",
			// 小さじ5g、大さじ15g（japanese-food.net）。
			density: { gramsPerMl: 1, approximate: false },
		}),
	]);
