import type { IngredientCatalogEntry } from "../ingredient-catalog";
import {
	entry,
	presetsFor,
	withDefaultCategory,
} from "../ingredient-catalog-entry";
// 主食・麺・缶詰（スパゲティ、うどん、パン、ご飯、トマト缶など）。出典と `approximate` の意味は、index.ts を参照。
export const staplesEntries: readonly IngredientCatalogEntry[] =
	withDefaultCategory("staples", [
		entry({
			id: "spaghetti",
			name: "スパゲティ",
			aliases: ["スパゲティ", "スパゲッティ", "パスタ"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "300g袋", quantity: 1, unit: "袋", code: "bag", per: 300 },
				{ label: "500g袋", quantity: 1, unit: "袋", code: "bag", per: 500 },
			]),
		}),
		entry({
			id: "somen",
			name: "そうめん",
			aliases: ["そうめん", "素麺"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "300g袋", quantity: 1, unit: "袋", code: "bag", per: 300 },
			]),
			unitWeights: [{ unit: "束", grams: 50, approximate: true }],
		}),
		entry({
			id: "rice",
			name: "米",
			aliases: ["米", "お米", "白米", "精米"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "2kg袋", quantity: 1, unit: "袋", code: "bag", per: 2000 },
				{ label: "5kg袋", quantity: 1, unit: "袋", code: "bag", per: 5000 },
				{ label: "10kg袋", quantity: 1, unit: "袋", code: "bag", per: 10000 },
			]),
			// 1合（米用の計量カップすりきり、約180ml）の精米の重さ。品種や水分で差がある（パナソニック「お米1合は何グラム？」）。
			unitWeights: [{ unit: "合", grams: 150, approximate: true }],
		}),
		entry({
			id: "cooked-rice",
			name: "ご飯",
			aliases: ["ご飯", "ごはん", "白ごはん"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "3食パック(600g)",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 600,
				},
			]),
			// 茶碗1杯。
			unitWeights: [{ unit: "杯", grams: 150, approximate: true }],
		}),
		entry({
			id: "mochi",
			name: "もち",
			aliases: ["もち", "餅", "切り餅"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{
					label: "1kg袋(約20個)",
					quantity: 1,
					unit: "袋",
					code: "bag",
					per: 20,
				},
			]),
			// 出典を確認できていない（切り餅1個約50g）。
			unitWeights: [{ unit: "個", grams: 50, approximate: true }],
		}),
		entry({
			id: "bread",
			name: "食パン",
			aliases: ["食パン", "パン"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "6枚切", quantity: 1, unit: "袋", code: "bag", per: 6 },
				{ label: "8枚切", quantity: 1, unit: "袋", code: "bag", per: 8 },
			]),
			categoryId: "bakery",
			// 6枚切り。8枚切りは約45g。
			unitWeights: [{ unit: "枚", grams: 60, approximate: true }],
		}),
		entry({
			id: "bun",
			name: "バンズ",
			aliases: ["バンズ", "ハンバーガー用パン"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "4個入り", quantity: 1, unit: "袋", code: "bag", per: 4 },
			]),
			categoryId: "bakery",
			// 出典を確認できていない。
			unitWeights: [{ unit: "個", grams: 55, approximate: true }],
		}),
		entry({
			id: "boiled-udon",
			name: "ゆでうどん",
			aliases: ["ゆでうどん", "茹でうどん", "うどん"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1玉", quantity: 1, unit: "玉", code: "count", per: 1 },
				{
					label: "3玉パック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 3,
				},
			]),
			categoryId: "chilled",
			// 出典によって、200〜250g。
			unitWeights: [{ unit: "玉", grams: 250, approximate: true }],
		}),
		entry({
			id: "frozen-udon",
			name: "冷凍うどん",
			aliases: ["冷凍うどん"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{
					label: "5食パック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 5,
				},
			]),
			categoryId: "frozen",
			unitWeights: [{ unit: "玉", grams: 200, approximate: true }],
		}),
		entry({
			id: "soba",
			name: "そば",
			aliases: ["そば", "蕎麦", "乾そば"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "300g袋", quantity: 1, unit: "袋", code: "bag", per: 300 },
			]),
			// 乾麺1束は100g（ユーザー提供の換算表）。
			unitWeights: [{ unit: "束", grams: 100, approximate: true }],
		}),
		entry({
			id: "chinese-noodles",
			name: "中華麺",
			aliases: ["中華麺", "中華めん"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1玉", quantity: 1, unit: "玉", code: "count", per: 1 },
				{
					label: "3食パック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 3,
				},
			]),
			categoryId: "chilled",
			// 生麺1玉。
			unitWeights: [{ unit: "玉", grams: 110, approximate: true }],
		}),
		entry({
			id: "macaroni",
			name: "マカロニ",
			aliases: ["マカロニ"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "150g袋", quantity: 1, unit: "袋", code: "bag", per: 150 },
				{ label: "200g袋", quantity: 1, unit: "袋", code: "bag", per: 200 },
			]),
			// 大さじ1が約8〜10g。形状でぶれる（ユーザー提供の換算表）。
			density: { gramsPerMl: 0.6, approximate: true },
		}),
		entry({
			id: "canned-tomato",
			name: "トマト缶",
			aliases: ["トマト缶"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "1缶(400g)", quantity: 1, unit: "缶", code: "can", per: 400 },
			]),
			categoryId: "pantry",
			unitWeights: [{ unit: "缶", grams: 400, approximate: false }],
		}),
		entry({
			id: "cut-tomato-can",
			name: "カットトマト缶",
			aliases: ["カットトマト缶", "カットトマト"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "1缶(400g)", quantity: 1, unit: "缶", code: "can", per: 400 },
			]),
			categoryId: "pantry",
			unitWeights: [{ unit: "缶", grams: 400, approximate: false }],
		}),
		entry({
			id: "whole-tomato-can",
			name: "ホールトマト缶",
			aliases: ["ホールトマト缶", "ホールトマト"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "1缶(400g)", quantity: 1, unit: "缶", code: "can", per: 400 },
			]),
			categoryId: "pantry",
			unitWeights: [{ unit: "缶", grams: 400, approximate: false }],
		}),
	]);
