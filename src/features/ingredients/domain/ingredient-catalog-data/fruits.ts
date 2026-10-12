import type { IngredientCatalogEntry } from "../ingredient-catalog";
import {
	entry,
	presetsFor,
	withDefaultCategory,
} from "../ingredient-catalog-entry";

// 果物。個数の重さは、皮・種・へたを含む、丸ごと1個の目安（買うときの単位）。
// 資料によって、可食部の重さ（正味）と丸ごとの重さが混ざっていて、値に幅がある（例：みかん75〜100g、
// オレンジ120〜250g、バナナ1本100〜200g）ので、すべて `approximate: true`。確かな出典は確認できていない。
// レモンは、野菜と同じファイル（vegetables.ts）にある。
export const fruitsEntries: readonly IngredientCatalogEntry[] =
	withDefaultCategory("produce", [
		entry({
			id: "apple",
			name: "りんご",
			aliases: ["りんご", "リンゴ", "林檎"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1個", quantity: 1, unit: "個", code: "count", per: 1 },
				{ label: "3個袋", quantity: 1, unit: "袋", code: "bag", per: 3 },
			]),
			unitWeights: [{ unit: "個", grams: 300, approximate: true }],
		}),
		entry({
			id: "banana",
			name: "バナナ",
			aliases: ["バナナ", "ばなな"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1本", quantity: 1, unit: "本", code: "count", per: 1 },
				{ label: "1房(4本)", quantity: 1, unit: "房", code: "pack", per: 4 },
			]),
			unitWeights: [{ unit: "本", grams: 150, approximate: true }],
		}),
		entry({
			id: "mikan",
			name: "みかん",
			aliases: ["みかん", "ミカン", "蜜柑", "温州みかん"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1個", quantity: 1, unit: "個", code: "count", per: 1 },
				{ label: "1袋(5個)", quantity: 1, unit: "袋", code: "bag", per: 5 },
			]),
			unitWeights: [{ unit: "個", grams: 90, approximate: true }],
		}),
		entry({
			id: "orange",
			name: "オレンジ",
			aliases: ["オレンジ", "おれんじ", "オレンジ(果物)"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1個", quantity: 1, unit: "個", code: "count", per: 1 },
				{ label: "1袋(3個)", quantity: 1, unit: "袋", code: "bag", per: 3 },
			]),
			unitWeights: [{ unit: "個", grams: 200, approximate: true }],
		}),
		entry({
			id: "grapefruit",
			name: "グレープフルーツ",
			aliases: ["グレープフルーツ", "グレフル", "グレープフルーツ(果物)"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1個", quantity: 1, unit: "個", code: "count", per: 1 },
			]),
			unitWeights: [{ unit: "個", grams: 350, approximate: true }],
		}),
		entry({
			id: "kiwi",
			name: "キウイ",
			aliases: ["キウイ", "キウイフルーツ", "きうい"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1個", quantity: 1, unit: "個", code: "count", per: 1 },
				{
					label: "1パック(4個)",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 4,
				},
			]),
			unitWeights: [{ unit: "個", grams: 100, approximate: true }],
		}),
		entry({
			id: "pear",
			name: "梨",
			aliases: ["梨", "なし", "ナシ", "日本梨"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1個", quantity: 1, unit: "個", code: "count", per: 1 },
			]),
			unitWeights: [{ unit: "個", grams: 300, approximate: true }],
		}),
		entry({
			id: "peach",
			name: "桃",
			aliases: ["桃", "もも(果物)", "モモ(果物)"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1個", quantity: 1, unit: "個", code: "count", per: 1 },
			]),
			unitWeights: [{ unit: "個", grams: 250, approximate: true }],
		}),
		entry({
			id: "persimmon",
			name: "柿",
			aliases: ["柿", "カキ(果物)", "かき(果物)"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1個", quantity: 1, unit: "個", code: "count", per: 1 },
			]),
			unitWeights: [{ unit: "個", grams: 200, approximate: true }],
		}),
		entry({
			id: "strawberry",
			name: "いちご",
			aliases: ["いちご", "イチゴ", "苺", "ストロベリー"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "1パック(約250g)",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 250,
				},
			]),
			// 1粒の重さの目安。
			unitWeights: [{ unit: "粒", grams: 15, approximate: true }],
		}),
		entry({
			id: "grape",
			name: "ぶどう",
			aliases: ["ぶどう", "ブドウ", "葡萄", "巨峰", "シャインマスカット"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "1房(約350g)",
					quantity: 1,
					unit: "房",
					code: "pack",
					per: 350,
				},
			]),
			unitWeights: [{ unit: "粒", grams: 10, approximate: true }],
		}),
		entry({
			id: "blueberry",
			name: "ブルーベリー",
			aliases: ["ブルーベリー", "ぶるーべりー"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "1パック(100g)",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 100,
				},
			]),
		}),
		entry({
			id: "cherry",
			name: "さくらんぼ",
			aliases: ["さくらんぼ", "サクランボ", "チェリー", "佐藤錦"],
			stockUnitCode: "g",
			presets: presetsFor("g", [
				{
					label: "1パック(約200g)",
					quantity: 1,
					unit: "パック",
					code: "pack",
					per: 200,
				},
			]),
		}),
		entry({
			id: "pineapple",
			name: "パイナップル",
			aliases: ["パイナップル", "パイン", "ぱいなっぷる"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1個", quantity: 1, unit: "個", code: "count", per: 1 },
			]),
			unitWeights: [{ unit: "個", grams: 1500, approximate: true }],
		}),
		entry({
			id: "avocado",
			name: "アボカド",
			aliases: ["アボカド", "アボガド", "あぼかど"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1個", quantity: 1, unit: "個", code: "count", per: 1 },
				{ label: "2個入り", quantity: 1, unit: "袋", code: "bag", per: 2 },
			]),
			unitWeights: [{ unit: "個", grams: 180, approximate: true }],
		}),
		entry({
			id: "yuzu",
			name: "ゆず",
			aliases: ["ゆず", "柚子", "ユズ"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1個", quantity: 1, unit: "個", code: "count", per: 1 },
			]),
			unitWeights: [{ unit: "個", grams: 100, approximate: true }],
		}),
		entry({
			id: "lime",
			name: "ライム",
			aliases: ["ライム", "らいむ"],
			stockUnitCode: "count",
			presets: presetsFor("count", [
				{ label: "1個", quantity: 1, unit: "個", code: "count", per: 1 },
			]),
			unitWeights: [{ unit: "個", grams: 70, approximate: true }],
		}),
	]);
