import type { IngredientCatalogEntry } from "../ingredient-catalog";
import {
	entry,
	presetsFor,
	withDefaultCategory,
} from "../ingredient-catalog-entry";
// 肉・魚介（肉の部位、ひき肉、加工肉、魚介、缶詰）。出典と `approximate` の意味は、index.ts を参照。
export const meatAndSeafoodEntries: readonly IngredientCatalogEntry[] =
	withDefaultCategory("meat", [
		entry({
			id: "chicken-thigh",
			name: "鶏もも肉",
			aliases: ["鶏もも肉", "鶏もも", "もも肉"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "300gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 300,
				},
			]),
			unitWeights: [{ unit: "枚", grams: 250, approximate: true }],
		}),
		entry({
			id: "chicken-breast",
			name: "鶏むね肉",
			aliases: ["鶏むね肉", "鶏胸肉", "むね肉"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "300gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 300,
				},
			]),
			// 出典によって、180〜280g。
			unitWeights: [{ unit: "枚", grams: 250, approximate: true }],
		}),
		entry({
			id: "chicken-tenderloin",
			name: "ささみ",
			aliases: ["ささみ", "鶏ささみ", "鶏ささ身"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "200gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 200,
				},
			]),
			unitWeights: [{ unit: "本", grams: 55, approximate: true }],
		}),
		entry({
			id: "chicken-wing-tip",
			name: "手羽先",
			aliases: ["手羽先"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "200gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 200,
				},
			]),
			// 1本が約50〜60g。骨を含む（ユーザー提供の換算表）。
			unitWeights: [{ unit: "本", grams: 55, approximate: true }],
		}),
		entry({
			id: "chicken-drumette",
			name: "手羽元",
			aliases: ["手羽元"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "300gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 300,
				},
			]),
			// 1本が約50〜60g。骨を含む（ユーザー提供の換算表）。
			unitWeights: [{ unit: "本", grams: 55, approximate: true }],
		}),
		entry({
			id: "pork-belly",
			name: "豚バラ肉",
			aliases: ["豚バラ肉", "豚バラ", "豚ばら肉"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "200gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 200,
				},
			]),
		}),
		entry({
			id: "pork",
			name: "豚肉",
			aliases: ["豚肉", "豚こま切れ肉", "豚こま"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "200gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 200,
				},
			]),
		}),
		entry({
			id: "pork-loin",
			name: "豚ロース肉",
			aliases: ["豚ロース肉", "豚ロース", "ロース肉"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "200gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 200,
				},
			]),
		}),
		entry({
			id: "pork-shoulder-loin",
			name: "豚肩ロース肉",
			aliases: ["豚肩ロース肉", "豚肩ロース", "肩ロース"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "200gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 200,
				},
			]),
		}),
		entry({
			id: "pork-leg",
			name: "豚もも肉",
			aliases: ["豚もも肉", "豚もも"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "200gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 200,
				},
			]),
		}),
		entry({
			id: "beef",
			name: "牛肉",
			aliases: [
				"牛肉",
				"牛こま切れ肉",
				"牛こま",
				"牛切り落とし",
				"牛切り落とし肉",
				"牛薄切り肉",
			],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "200gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 200,
				},
			]),
		}),
		entry({
			id: "mixed-ground-meat",
			name: "合い挽き肉",
			aliases: [
				"合い挽き肉",
				"合いびき肉",
				"合挽き肉",
				"合びき肉",
				"合い挽き",
				"合いびき",
				"ひき肉",
				"挽き肉",
			],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "200gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 200,
				},
			]),
		}),
		entry({
			id: "ground-chicken",
			name: "鶏ひき肉",
			aliases: ["鶏ひき肉", "鶏挽き肉", "鶏ミンチ"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "200gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 200,
				},
			]),
		}),
		entry({
			id: "ground-pork",
			name: "豚ひき肉",
			aliases: ["豚ひき肉", "豚挽き肉", "豚ミンチ"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "200gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 200,
				},
			]),
		}),
		entry({
			id: "bacon",
			name: "ベーコン",
			aliases: ["ベーコン"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "3連パック(約110g)",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 110,
				},
			]),
			unitWeights: [{ unit: "枚", grams: 20, approximate: true }],
		}),
		entry({
			id: "sausage",
			name: "ソーセージ",
			aliases: ["ソーセージ", "ウインナー", "ウィンナー"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{
					label: "2束パック(12本)",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 12,
				},
			]),
			// 商品によって、17〜22g。
			unitWeights: [{ unit: "本", grams: 20, approximate: true }],
		}),
		entry({
			id: "salmon",
			name: "鮭",
			aliases: ["鮭", "しゃけ", "サーモン", "生鮭"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{
					label: "2切れパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 2,
				},
				{
					label: "3切れパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 3,
				},
			]),
			categoryId: "seafood",
			// 出典を確認できていない（1切れ約80〜100g）。
			unitWeights: [{ unit: "切れ", grams: 90, approximate: true }],
		}),
		entry({
			id: "tuna-can",
			name: "ツナ",
			aliases: ["ツナ", "ツナ缶"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "1缶", quantity: 1, unit: "缶", code: "can", per: 70 },
				{
					label: "3缶パック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 210,
				},
			]),
			categoryId: "pantry",
			// 小缶。商品によって違う。
			unitWeights: [{ unit: "缶", grams: 70, approximate: true }],
		}),
		entry({
			id: "cod-roe",
			name: "たらこ",
			aliases: ["たらこ", "タラコ"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "100gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 100,
				},
			]),
			categoryId: "seafood",
			// 出典を確認できていない（1腹で約80g。1本＝半腹）。
			unitWeights: [{ unit: "腹", grams: 80, approximate: true }],
		}),
		entry({
			id: "shrimp",
			name: "えび",
			aliases: ["えび", "海老", "エビ"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "150gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 150,
				},
			]),
			categoryId: "seafood",
			// 出典によって、20〜30g（サイズで違う）。
			unitWeights: [{ unit: "尾", grams: 20, approximate: true }],
		}),
		entry({
			id: "squid",
			name: "いか",
			aliases: ["いか", "イカ"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{ label: "1杯", quantity: 1, unit: "杯", code: "count", per: 250 },
			]),
			categoryId: "seafood",
			// 出典によって、200〜300g。
			unitWeights: [{ unit: "杯", grams: 250, approximate: true }],
		}),
		entry({
			id: "clam",
			name: "あさり",
			aliases: ["あさり", "アサリ"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "150gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 150,
				},
			]),
			categoryId: "seafood",
			// 殻つき1個。
			unitWeights: [{ unit: "個", grams: 10, approximate: true }],
		}),
		entry({
			id: "canned-mackerel",
			name: "サバ缶",
			aliases: ["サバ缶", "さば缶", "鯖缶", "サバ水煮缶", "さば水煮缶"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1缶", quantity: 1, unit: "缶", code: "can", per: 1 },
			]),
			categoryId: "pantry",
			// スーパーで一般的な標準サイズは190g（ユーザー提供の換算表）。
			unitWeights: [{ unit: "缶", grams: 190, approximate: true }],
		}),
		entry({
			id: "shirasu",
			name: "しらす",
			aliases: ["しらす", "シラス", "しらす干し"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "1パック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 70,
				},
			]),
			categoryId: "seafood",
			// 微乾燥品1パックは、約70g。
			unitWeights: [{ unit: "パック", grams: 70, approximate: true }],
		}),
		entry({
			id: "bonito-tataki",
			name: "かつおのたたき",
			aliases: ["かつおのたたき", "鰹のたたき", "カツオのたたき"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "150gパック",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 150,
				},
			]),
			categoryId: "seafood",
		}),
	]);
