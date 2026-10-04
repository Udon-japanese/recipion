import type { IngredientCatalogEntry } from "../ingredient-catalog";
import { entry, withDefaultCategory } from "../ingredient-catalog-entry";
// 野菜・きのこ。出典と `approximate` の意味は、index.ts を参照。
export const vegetablesEntries: readonly IngredientCatalogEntry[] =
	withDefaultCategory("produce", [
		entry({
			id: "onion",
			name: "玉ねぎ",
			aliases: ["玉ねぎ", "たまねぎ", "玉葱", "タマネギ", "オニオン"],
			stockUnitCode: "count",
			unitWeights: [{ unit: "個", size: "中", grams: 200, approximate: true }],
		}),
		entry({
			id: "potato",
			name: "じゃがいも",
			aliases: [
				"じゃがいも",
				"ジャガイモ",
				"じゃが芋",
				"ポテト",
				"ポテト(じゃがいも)",
			],
			stockUnitCode: "count",
			unitWeights: [{ unit: "個", size: "中", grams: 150, approximate: true }],
		}),
		entry({
			id: "carrot",
			name: "にんじん",
			aliases: ["にんじん", "人参", "ニンジン"],
			stockUnitCode: "count",
			unitWeights: [{ unit: "本", grams: 150, approximate: true }],
		}),
		entry({
			id: "cabbage",
			name: "キャベツ",
			aliases: ["キャベツ", "ざくぎりキャベツ", "千切りキャベツ"],
			stockUnitCode: "g",
			unitWeights: [
				{ unit: "枚", grams: 50, approximate: true },
				{ unit: "玉", grams: 1200, approximate: true },
			],
		}),
		entry({
			id: "spinach",
			name: "ほうれん草",
			aliases: ["ほうれん草", "ほうれんそう", "ホウレンソウ"],
			stockUnitCode: "g",
			unitWeights: [{ unit: "束", grams: 200, approximate: true }],
		}),
		entry({
			id: "tomato",
			name: "トマト",
			aliases: ["トマト"],
			stockUnitCode: "count",
			unitWeights: [{ unit: "個", grams: 200, approximate: true }],
		}),
		entry({
			id: "cherry-tomato",
			name: "ミニトマト",
			aliases: ["ミニトマト", "プチトマト"],
			stockUnitCode: "count",
			// 出典を確認できていない（1個10〜15g）。
			unitWeights: [{ unit: "個", grams: 12, approximate: true }],
		}),
		entry({
			id: "bell-pepper",
			name: "パプリカ",
			aliases: ["パプリカ", "パプリカ(赤)", "赤パプリカ"],
			stockUnitCode: "g",
			unitWeights: [{ unit: "個", grams: 150, approximate: true }],
		}),
		entry({
			id: "green-pepper",
			name: "ピーマン",
			aliases: ["ピーマン"],
			stockUnitCode: "count",
			unitWeights: [{ unit: "個", grams: 35, approximate: true }],
		}),
		entry({
			id: "eggplant",
			name: "なす",
			aliases: ["なす", "ナス", "茄子"],
			stockUnitCode: "count",
			unitWeights: [{ unit: "本", grams: 80, approximate: true }],
		}),
		entry({
			id: "cucumber",
			name: "きゅうり",
			aliases: ["きゅうり", "キュウリ", "胡瓜"],
			stockUnitCode: "count",
			unitWeights: [{ unit: "本", grams: 100, approximate: true }],
		}),
		entry({
			id: "long-onion",
			name: "長ねぎ",
			aliases: [
				"長ねぎ",
				"長ネギ",
				"長葱",
				"ねぎ",
				"ネギ",
				"白ねぎ",
				"白ネギ",
				"白葱",
			],
			stockUnitCode: "count",
			unitWeights: [{ unit: "本", grams: 100, approximate: true }],
		}),
		entry({
			id: "green-onion",
			name: "細ねぎ",
			aliases: [
				"細ねぎ",
				"細ねぎ(刻み)",
				"小ねぎ",
				"万能ねぎ",
				"青ねぎ",
				"刻みねぎ",
			],
			stockUnitCode: "g",
		}),
		entry({
			id: "garlic",
			name: "にんにく",
			aliases: ["にんにく", "ニンニク", "大蒜"],
			stockUnitCode: "g",
			unitWeights: [
				{ unit: "片", grams: 8, approximate: true },
				{ unit: "かけ", grams: 8, approximate: true },
			],
		}),
		entry({
			id: "ginger",
			name: "しょうが",
			aliases: ["しょうが", "生姜", "ショウガ"],
			stockUnitCode: "g",
			unitWeights: [
				{ unit: "片", grams: 12, approximate: true },
				{ unit: "かけ", grams: 12, approximate: true },
			],
		}),
		entry({
			id: "lemon",
			name: "レモン",
			aliases: ["レモン"],
			stockUnitCode: "count",
			// 出典を確認できていない。
			unitWeights: [{ unit: "個", grams: 120, approximate: true }],
		}),
		entry({
			id: "perilla",
			name: "大葉",
			aliases: ["大葉", "しそ", "青じそ", "シソ"],
			stockUnitCode: "count",
			// 出典を確認できていない（1枚約1g）。
			unitWeights: [{ unit: "枚", grams: 1, approximate: true }],
		}),
		entry({
			id: "shimeji",
			name: "しめじ",
			aliases: ["しめじ", "シメジ"],
			stockUnitCode: "g",
			unitWeights: [{ unit: "パック", grams: 100, approximate: true }],
		}),
		entry({
			id: "eringi",
			name: "エリンギ",
			aliases: ["エリンギ"],
			stockUnitCode: "g",
			// 1本は約50g、1パックは約100g。
			unitWeights: [
				{ unit: "本", grams: 50, approximate: true },
				{ unit: "パック", grams: 100, approximate: true },
			],
		}),
		entry({
			id: "kimchi",
			name: "キムチ",
			aliases: ["キムチ", "白菜キムチ"],
			stockUnitCode: "g",
			categoryId: "chilled",
		}),
		entry({
			id: "daikon",
			name: "大根",
			aliases: ["大根", "だいこん", "ダイコン"],
			stockUnitCode: "g",
			// 出典によって、1000〜1200g。
			unitWeights: [{ unit: "本", grams: 1000, approximate: true }],
		}),
		entry({
			id: "napa-cabbage",
			name: "白菜",
			aliases: ["白菜", "はくさい", "ハクサイ"],
			stockUnitCode: "g",
			// 出典によって、2000〜2800g（1玉）。
			unitWeights: [{ unit: "玉", grams: 2000, approximate: true }],
		}),
		entry({
			id: "bean-sprouts",
			name: "もやし",
			aliases: ["もやし", "モヤシ"],
			stockUnitCode: "g",
			// 出典によって、200〜250g。
			unitWeights: [{ unit: "袋", grams: 200, approximate: true }],
		}),
		entry({
			id: "broccoli",
			name: "ブロッコリー",
			aliases: ["ブロッコリー"],
			stockUnitCode: "g",
			// 出典によって、200〜300g。
			unitWeights: [{ unit: "株", grams: 250, approximate: true }],
		}),
		entry({
			id: "lettuce",
			name: "レタス",
			aliases: ["レタス"],
			stockUnitCode: "g",
			// 1玉が約400g、1枚が約30g（ユーザー提供の換算表）。
			unitWeights: [
				{ unit: "玉", grams: 400, approximate: true },
				{ unit: "枚", grams: 30, approximate: true },
			],
		}),
		entry({
			id: "sweet-potato",
			name: "さつまいも",
			aliases: ["さつまいも", "サツマイモ", "さつま芋"],
			stockUnitCode: "g",
			unitWeights: [{ unit: "本", grams: 200, approximate: true }],
		}),
		entry({
			id: "kabocha",
			name: "かぼちゃ",
			aliases: ["かぼちゃ", "カボチャ", "南瓜"],
			stockUnitCode: "g",
			// 1/4個が、約300〜325g。
			unitWeights: [{ unit: "玉", grams: 1250, approximate: true }],
		}),
		entry({
			id: "burdock",
			name: "ごぼう",
			aliases: ["ごぼう", "ゴボウ", "牛蒡"],
			stockUnitCode: "g",
			// 出典によって、150〜180g。
			unitWeights: [{ unit: "本", grams: 180, approximate: true }],
		}),
		entry({
			id: "lotus-root",
			name: "れんこん",
			aliases: ["れんこん", "レンコン", "蓮根"],
			stockUnitCode: "g",
			unitWeights: [{ unit: "節", grams: 200, approximate: true }],
		}),
		entry({
			id: "enoki",
			name: "えのき",
			aliases: ["えのき", "えのきだけ", "エノキ"],
			stockUnitCode: "g",
			// 出典によって、100〜200g。
			unitWeights: [{ unit: "袋", grams: 200, approximate: true }],
		}),
		entry({
			id: "shiitake",
			name: "しいたけ",
			aliases: ["しいたけ", "椎茸", "シイタケ"],
			stockUnitCode: "g",
			unitWeights: [{ unit: "個", grams: 15, approximate: true }],
		}),
		entry({
			id: "maitake",
			name: "まいたけ",
			aliases: ["まいたけ", "舞茸", "マイタケ"],
			stockUnitCode: "g",
			unitWeights: [{ unit: "パック", grams: 100, approximate: true }],
		}),
	]);
