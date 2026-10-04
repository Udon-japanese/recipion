import type { IngredientCatalogEntry } from "../ingredient-catalog";
import {
	entry,
	presetsFor,
	withDefaultCategory,
} from "../ingredient-catalog-entry";
// 粉・粒・スパイス（塩、砂糖、胡椒、粉類、パン粉、だしの素、ルー）。出典と `approximate` の意味は、index.ts を参照。
export const powdersAndSpicesEntries: readonly IngredientCatalogEntry[] =
	withDefaultCategory("pantry", [
		entry({
			id: "salt",
			name: "塩",
			aliases: ["塩", "食塩", "精製塩"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "1kg袋", quantity: 1, unit: "袋", code: "bag", per: 1000 },
			]),
			density: { gramsPerMl: 1.2, approximate: false },
		}),
		entry({
			id: "coarse-salt",
			name: "粗塩",
			aliases: ["粗塩", "天然塩"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "500g袋", quantity: 1, unit: "袋", code: "bag", per: 500 },
			]),
			// 小さじ5g、大さじ15g（白ごはん.com）。
			density: { gramsPerMl: 1, approximate: false },
		}),
		entry({
			id: "rock-salt",
			name: "岩塩",
			aliases: ["岩塩"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "100g袋", quantity: 1, unit: "袋", code: "bag", per: 100 },
			]),
			// 粒の大きさで違う。出典未確認。
			density: { gramsPerMl: 1, approximate: true },
		}),
		entry({
			id: "magic-salt",
			name: "マジックソルト",
			aliases: ["マジックソルト"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "80gボトル",
					quantity: 1,
					unit: "ボトル",
					code: "bottle",
					per: 80,
				},
			]),
			// 出典未確認。
			density: { gramsPerMl: 1, approximate: true },
		}),
		entry({
			id: "salt-and-pepper",
			name: "塩胡椒",
			aliases: ["塩胡椒", "塩こしょう"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "110g瓶",
					quantity: 1,
					unit: "ボトル",
					code: "bottle",
					per: 110,
				},
			]),
			// 商品によって、塩と胡椒の割合が違う。
			density: { gramsPerMl: 1.1, approximate: true },
		}),
		entry({
			id: "sugar",
			name: "砂糖",
			aliases: ["砂糖", "上白糖", "さとう"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "1kg袋", quantity: 1, unit: "袋", code: "bag", per: 1000 },
			]),
			density: { gramsPerMl: 0.6, approximate: false },
		}),
		entry({
			id: "granulated-sugar",
			name: "グラニュー糖",
			aliases: ["グラニュー糖"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "1kg袋", quantity: 1, unit: "袋", code: "bag", per: 1000 },
			]),
			// 小さじ4g、大さじ12g（イチビキ）。
			density: { gramsPerMl: 0.8, approximate: false },
		}),
		entry({
			id: "brown-sugar-sanontou",
			name: "三温糖",
			aliases: ["三温糖"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "1kg袋", quantity: 1, unit: "袋", code: "bag", per: 1000 },
			]),
			// 上白糖に近い値を仮置きしている。
			density: { gramsPerMl: 0.6, approximate: true },
		}),
		entry({
			id: "kibi-sugar",
			name: "きび砂糖",
			aliases: ["きび砂糖", "きびざとう"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "750g袋", quantity: 1, unit: "袋", code: "bag", per: 750 },
			]),
			// 上白糖に近い値を仮置きしている。
			density: { gramsPerMl: 0.6, approximate: true },
		}),
		entry({
			id: "kokuto",
			name: "黒糖",
			aliases: ["黒糖", "粉黒糖"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "300g袋", quantity: 1, unit: "袋", code: "bag", per: 300 },
			]),
			// 粉末の黒糖。出典未確認（上白糖に近い値を仮置き）。
			density: { gramsPerMl: 0.6, approximate: true },
		}),
		entry({
			id: "oligosaccharide",
			name: "オリゴ糖",
			aliases: ["オリゴ糖", "オリゴ"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "1000gボトル",
					quantity: 1,
					unit: "ボトル",
					code: "bottle",
					per: 1000,
				},
			]),
			// シロップ。出典を確認できていない。
			density: { gramsPerMl: 1.4, approximate: true },
		}),
		entry({
			id: "black-pepper",
			name: "黒胡椒",
			aliases: ["黒胡椒", "黒こしょう", "ブラックペッパー"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "15g瓶",
					quantity: 1,
					unit: "ボトル",
					code: "bottle",
					per: 15,
				},
			]),
			density: { gramsPerMl: 0.4, approximate: false },
		}),
		entry({
			id: "coarse-black-pepper",
			name: "粗挽き胡椒",
			aliases: [
				"粗挽き胡椒",
				"粗挽きこしょう",
				"粗びき胡椒",
				"粗びきこしょう",
				"粗挽き黒胡椒",
				"粗びき黒こしょう",
			],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "15g瓶",
					quantity: 1,
					unit: "ボトル",
					code: "bottle",
					per: 15,
				},
			]),
			// 黒胡椒（粉）の値を仮置きしている。
			density: { gramsPerMl: 0.4, approximate: true },
		}),
		entry({
			id: "pepper",
			name: "胡椒",
			aliases: ["胡椒", "こしょう", "コショウ", "白胡椒", "白こしょう"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "14g瓶",
					quantity: 1,
					unit: "ボトル",
					code: "bottle",
					per: 14,
				},
			]),
			// 黒胡椒の値を仮置きしている。白胡椒は少し重い。
			density: { gramsPerMl: 0.45, approximate: true },
		}),
		entry({
			id: "nutmeg",
			name: "ナツメグ",
			aliases: ["ナツメグ", "ナツメッグ"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "15g瓶",
					quantity: 1,
					unit: "ボトル",
					code: "bottle",
					per: 15,
				},
			]),
			density: { gramsPerMl: 0.34, approximate: false },
		}),
		entry({
			id: "chili-pepper",
			name: "一味唐辛子",
			aliases: ["一味唐辛子", "一味"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "15g瓶",
					quantity: 1,
					unit: "ボトル",
					code: "bottle",
					per: 15,
				},
			]),
			// 出典を確認できていない。
			density: { gramsPerMl: 0.4, approximate: true },
		}),
		entry({
			id: "wheat-flour",
			name: "薄力粉",
			aliases: ["薄力粉", "小麦粉"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "1kg袋", quantity: 1, unit: "袋", code: "bag", per: 1000 },
			]),
			categoryId: "staples",
			density: { gramsPerMl: 0.6, approximate: false },
		}),
		entry({
			id: "medium-flour",
			name: "中力粉",
			aliases: ["中力粉"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "1kg袋", quantity: 1, unit: "袋", code: "bag", per: 1000 },
			]),
			categoryId: "staples",
			// 薄力粉の値を仮置きしている。
			density: { gramsPerMl: 0.6, approximate: true },
		}),
		entry({
			id: "bread-flour",
			name: "強力粉",
			aliases: ["強力粉"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "1kg袋", quantity: 1, unit: "袋", code: "bag", per: 1000 },
			]),
			categoryId: "staples",
			// 薄力粉の値を仮置きしている。
			density: { gramsPerMl: 0.6, approximate: true },
		}),
		entry({
			id: "potato-starch",
			name: "片栗粉",
			aliases: ["片栗粉"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "200g袋", quantity: 1, unit: "袋", code: "bag", per: 200 },
			]),
			categoryId: "staples",
			density: { gramsPerMl: 0.6, approximate: false },
		}),
		entry({
			id: "bread-crumbs",
			name: "パン粉",
			aliases: ["パン粉", "乾燥パン粉", "細目パン粉", "粗目パン粉"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "100g袋", quantity: 1, unit: "袋", code: "bag", per: 100 },
				{ label: "200g袋", quantity: 1, unit: "袋", code: "bag", per: 200 },
			]),
			categoryId: "staples",
			density: { gramsPerMl: 0.2, approximate: false },
		}),
		entry({
			id: "fresh-bread-crumbs",
			name: "生パン粉",
			aliases: ["生パン粉"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "120g袋", quantity: 1, unit: "袋", code: "bag", per: 120 },
			]),
			categoryId: "staples",
			// 大さじ1が約3〜5g、小さじ1が約1.5g（ユーザー提供の換算表）。乾燥パン粉より、水分を含む分、少し重い。
			density: { gramsPerMl: 0.25, approximate: true },
		}),
		entry({
			id: "hotcake-mix",
			name: "ホットケーキミックス",
			aliases: ["ホットケーキミックス", "ホケミ", "HM"],
			stockUnitCode: "g",
			categoryId: "snacks",
			// 小麦粉に近い値を仮置きしている。
			density: { gramsPerMl: 0.6, approximate: true },
			presets: [
				{
					label: "150g袋",
					quantity: 1,
					unitLabel: "袋",
					inventoryConversion: {
						inputUnitCode: "bag",
						stockUnitCode: "g",
						stockUnitLabel: "g",
						stockQuantityPerInputUnit: 150,
						trackingMode: "estimated",
					},
				},
				{
					label: "200g袋",
					quantity: 1,
					unitLabel: "袋",
					inventoryConversion: {
						inputUnitCode: "bag",
						stockUnitCode: "g",
						stockUnitLabel: "g",
						stockQuantityPerInputUnit: 200,
						trackingMode: "estimated",
					},
				},
			],
		}),
		entry({
			id: "chicken-stock-powder",
			name: "鶏がらスープの素",
			aliases: ["鶏がらスープの素", "鶏がらスープ", "鶏ガラスープ", "鶏がら"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "50g袋", quantity: 1, unit: "袋", code: "bag", per: 50 },
				{
					label: "100g瓶",
					quantity: 1,
					unit: "ボトル",
					code: "bottle",
					per: 100,
				},
			]),
			density: { gramsPerMl: 0.55, approximate: true },
		}),
		entry({
			id: "consomme",
			name: "コンソメ",
			aliases: ["コンソメ", "コンソメスープの素", "固形コンソメ"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "21個箱", quantity: 1, unit: "箱", code: "box", per: 21 },
			]),
			// 固形1個。顆粒のときは、大さじ1が約9g。
			unitWeights: [{ unit: "個", grams: 5, approximate: true }],
			density: { gramsPerMl: 0.6, approximate: false },
		}),
		entry({
			id: "dashi-powder",
			name: "和風だしの素",
			aliases: [
				"和風だしの素",
				"ほんだし",
				"顆粒だし",
				"和風顆粒だし",
				"だしの素",
			],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "8g×8袋", quantity: 1, unit: "箱", code: "box", per: 64 },
			]),
			// 小さじ1＝約3g、大さじ1＝約9g（ほんだしの計量表）。
			density: { gramsPerMl: 0.6, approximate: false },
		}),
		entry({
			id: "curry-roux",
			name: "カレールー",
			aliases: ["カレールー", "カレールゥ"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "1箱(8皿分)", quantity: 1, unit: "箱", code: "box", per: 160 },
			]),
			// 1かけ（1皿分）は、約18〜20g。
			unitWeights: [{ unit: "かけ", grams: 20, approximate: true }],
		}),
		entry({
			id: "stew-roux",
			name: "シチュールー",
			aliases: ["シチュールー", "シチュールゥ"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "1箱(8皿分)", quantity: 1, unit: "箱", code: "box", per: 160 },
			]),
			// 1かけ（1皿分）は、約18〜20g（ユーザー提供の換算表）。
			unitWeights: [{ unit: "かけ", grams: 20, approximate: true }],
		}),
	]);
