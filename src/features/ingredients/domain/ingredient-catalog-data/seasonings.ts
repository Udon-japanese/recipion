import type { IngredientCatalogEntry } from "../ingredient-catalog";
import { entry, withDefaultCategory } from "../ingredient-catalog-entry";
// 液体・ペースト状の調味料と油（醤油、味噌、酢、酒、ソース、だし、油など）。出典と `approximate` の意味は、index.ts を参照。
export const seasoningsEntries: readonly IngredientCatalogEntry[] =
	withDefaultCategory("pantry", [
		entry({
			id: "soy-sauce",
			name: "醤油",
			aliases: ["醤油", "しょうゆ", "しょう油", "濃口醤油"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 1.2, approximate: false },
		}),
		entry({
			id: "usukuchi-soy-sauce",
			name: "薄口醤油",
			aliases: ["薄口醤油", "うすくち醤油", "薄口しょうゆ"],
			stockUnitCode: "ml",
			// 濃口醤油の値を仮置きしている。
			density: { gramsPerMl: 1.2, approximate: true },
		}),
		entry({
			id: "tamari-soy-sauce",
			name: "たまり醤油",
			aliases: ["たまり醤油", "たまりしょうゆ", "たまり"],
			stockUnitCode: "ml",
			// 出典未確認（濃口醤油に近い値を仮置き）。
			density: { gramsPerMl: 1.2, approximate: true },
		}),
		entry({
			id: "dashi-soy-sauce",
			name: "だし醤油",
			aliases: ["だし醤油", "出汁醤油", "だししょうゆ"],
			stockUnitCode: "ml",
			// 出典未確認。
			density: { gramsPerMl: 1.15, approximate: true },
		}),
		entry({
			id: "vinegar",
			name: "酢",
			aliases: ["酢", "お酢", "穀物酢"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 1, approximate: false },
		}),
		entry({
			id: "rice-vinegar",
			name: "米酢",
			aliases: ["米酢"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 1, approximate: false },
		}),
		entry({
			id: "black-vinegar",
			name: "黒酢",
			aliases: ["黒酢"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 1, approximate: true },
		}),
		entry({
			id: "apple-vinegar",
			name: "リンゴ酢",
			aliases: ["リンゴ酢", "りんご酢"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 1, approximate: true },
		}),
		entry({
			id: "sushi-vinegar",
			name: "すし酢",
			aliases: ["すし酢", "寿司酢"],
			stockUnitCode: "ml",
			// 砂糖と塩が入る。出典未確認。
			density: { gramsPerMl: 1.1, approximate: true },
		}),
		entry({
			id: "sake",
			name: "酒",
			aliases: ["酒", "日本酒"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 1, approximate: false },
		}),
		entry({
			id: "cooking-sake",
			name: "料理酒",
			aliases: ["料理酒"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 1, approximate: false },
		}),
		entry({
			id: "mirin",
			name: "みりん",
			aliases: ["みりん", "本みりん"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 1.2, approximate: false },
		}),
		entry({
			id: "white-wine",
			name: "白ワイン",
			aliases: ["白ワイン"],
			stockUnitCode: "ml",
			// 出典未確認。
			density: { gramsPerMl: 1, approximate: true },
		}),
		entry({
			id: "red-wine",
			name: "赤ワイン",
			aliases: ["赤ワイン"],
			stockUnitCode: "ml",
			// 出典未確認。
			density: { gramsPerMl: 1, approximate: true },
		}),
		entry({
			id: "miso",
			name: "味噌",
			aliases: ["味噌", "みそ", "合わせ味噌", "合わせみそ"],
			stockUnitCode: "g",
			density: { gramsPerMl: 1.2, approximate: false },
		}),
		entry({
			id: "red-miso",
			name: "赤味噌",
			aliases: ["赤味噌", "赤みそ"],
			stockUnitCode: "g",
			// 味噌の値（大さじ18g）を仮置きしている。
			density: { gramsPerMl: 1.2, approximate: true },
		}),
		entry({
			id: "white-miso",
			name: "白味噌",
			aliases: ["白味噌", "白みそ"],
			stockUnitCode: "g",
			density: { gramsPerMl: 1.2, approximate: true },
		}),
		entry({
			id: "dashi-miso",
			name: "だし入り味噌",
			aliases: ["だし入り味噌", "だし入りみそ", "だし入り"],
			stockUnitCode: "g",
			density: { gramsPerMl: 1.2, approximate: true },
		}),
		entry({
			id: "mentsuyu",
			name: "めんつゆ",
			aliases: ["めんつゆ", "麺つゆ"],
			stockUnitCode: "ml",
			// 濃縮の倍率で違う。出典を確認できていない。
			density: { gramsPerMl: 1.1, approximate: true },
		}),
		entry({
			id: "shiro-dashi",
			name: "白だし",
			aliases: ["白だし", "白出汁"],
			stockUnitCode: "ml",
			// 大さじ1が15g（ユーザー提供の換算表。水と同じ比重で計算）。
			density: { gramsPerMl: 1, approximate: true },
		}),
		entry({
			id: "ponzu",
			name: "ポン酢",
			aliases: ["ポン酢", "ぽん酢"],
			stockUnitCode: "ml",
			// 出典を確認できていない。
			density: { gramsPerMl: 1.1, approximate: true },
		}),
		entry({
			id: "ketchup",
			name: "ケチャップ",
			aliases: ["ケチャップ", "トマトケチャップ"],
			stockUnitCode: "g",
			density: { gramsPerMl: 1.2, approximate: false },
		}),
		entry({
			id: "mayonnaise",
			name: "マヨネーズ",
			aliases: ["マヨネーズ", "マヨ"],
			stockUnitCode: "g",
			// 出典によって、大さじ12〜14g。
			density: { gramsPerMl: 0.9, approximate: true },
		}),
		entry({
			id: "worcester-sauce",
			name: "ウスターソース",
			aliases: ["ウスターソース", "ウスター", "ソース"],
			stockUnitCode: "ml",
			// 出典によって、大さじ15〜18g。
			density: { gramsPerMl: 1.15, approximate: true },
		}),
		entry({
			id: "chuno-sauce",
			name: "中濃ソース",
			aliases: ["中濃ソース", "中濃"],
			stockUnitCode: "ml",
			// 出典未確認（とんかつソースに近い値を仮置き）。
			density: { gramsPerMl: 1.2, approximate: true },
		}),
		entry({
			id: "tonkatsu-sauce",
			name: "とんかつソース",
			aliases: ["とんかつソース", "トンカツソース"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 1.2, approximate: true },
		}),
		entry({
			id: "oyster-sauce",
			name: "オイスターソース",
			aliases: ["オイスターソース"],
			stockUnitCode: "g",
			// 小さじ6g、大さじ19g（エスビー食品）。
			density: { gramsPerMl: 1.27, approximate: false },
		}),
		entry({
			id: "doubanjiang",
			name: "豆板醤",
			aliases: ["豆板醤", "トウバンジャン"],
			stockUnitCode: "g",
			// 小さじ5g、大さじ14g（エスビー食品）。
			density: { gramsPerMl: 0.93, approximate: false },
		}),
		entry({
			id: "gochujang",
			name: "コチュジャン",
			aliases: ["コチュジャン"],
			stockUnitCode: "g",
			// 出典によって、大さじ14〜21g。
			density: { gramsPerMl: 1.1, approximate: true },
		}),
		entry({
			id: "garlic-tube",
			name: "にんにくチューブ",
			aliases: ["にんにくチューブ", "おろしにんにく", "チューブにんにく"],
			stockUnitCode: "g",
			density: { gramsPerMl: 0.9, approximate: false },
		}),
		entry({
			id: "ginger-grated",
			name: "おろししょうが",
			aliases: ["おろししょうが", "おろし生姜", "しょうがチューブ"],
			stockUnitCode: "g",
			density: { gramsPerMl: 0.9, approximate: false },
		}),
		entry({
			id: "mustard-tube",
			name: "からしチューブ",
			aliases: ["からしチューブ", "チューブからし", "練りからし", "からし"],
			stockUnitCode: "g",
			// 小さじ5g、大さじ13g（エスビー食品）。
			density: { gramsPerMl: 0.87, approximate: false },
		}),
		entry({
			id: "wasabi-tube",
			name: "わさびチューブ",
			aliases: ["わさびチューブ", "チューブわさび", "練りわさび", "わさび"],
			stockUnitCode: "g",
			// 小さじ5g、大さじ13g（エスビー食品）。
			density: { gramsPerMl: 0.87, approximate: false },
		}),
		entry({
			id: "vanilla-essence",
			name: "バニラエッセンス",
			aliases: ["バニラエッセンス"],
			stockUnitCode: "ml",
		}),
		entry({
			id: "water",
			name: "水",
			aliases: ["水", "お湯", "湯"],
			stockUnitCode: "ml",
			categoryId: "beverages",
			density: { gramsPerMl: 1, approximate: false },
		}),
		entry({
			id: "lemon-juice",
			name: "レモン汁",
			aliases: ["レモン汁", "レモン果汁"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 1, approximate: true },
		}),
		entry({
			id: "olive-oil",
			name: "オリーブオイル",
			aliases: ["オリーブオイル", "オリーブ油"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 0.8, approximate: false },
		}),
		entry({
			id: "salad-oil",
			name: "サラダ油",
			aliases: ["サラダ油", "油", "植物油"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 0.8, approximate: false },
		}),
		entry({
			id: "sesame-oil",
			name: "ごま油",
			aliases: ["ごま油", "胡麻油"],
			stockUnitCode: "ml",
			density: { gramsPerMl: 0.8, approximate: false },
		}),
		entry({
			id: "white-sesame-oil",
			name: "白ごま油",
			aliases: ["白ごま油", "太白ごま油"],
			stockUnitCode: "ml",
			// 油の値（大さじ12g）。
			density: { gramsPerMl: 0.8, approximate: false },
		}),
	]);
