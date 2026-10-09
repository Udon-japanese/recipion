import type { IngredientCatalogEntry } from "../ingredient-catalog";
import {
	entry,
	presetsFor,
	withDefaultCategory,
} from "../ingredient-catalog-entry";

// 冷凍野菜（カットの種類ごと）。出典と `approximate` の意味は、index.ts を参照。
// 市販の冷凍野菜は、500g〜1kgの袋が一般的（ニチレイ、業務スーパーなど。商品で違う）。
// 在庫の単位は g。生の野菜（vegetables.ts）とは、別の食材として持つ。
function frozenBag(grams: number) {
	return presetsFor("g", [
		{
			label: grams >= 1000 ? `${grams / 1000}kg袋` : `${grams}g袋`,
			quantity: 1,
			unit: "袋",
			code: "bag",
			per: grams,
		},
	]);
}

// 冷凍野菜が、代わりになる生の食材の名前は、名前から決める：「冷凍」と、後ろの括弧を除く
// （「冷凍玉ねぎ(みじん切り)」→「玉ねぎ」）。決まらないものは、その食材の `standsFor` に書く
// （空の配列は、生の食材の代わりにならない）。
function freshNameFromFrozenName(name: string): string {
	return name
		.replace(/^冷凍/u, "")
		.replace(/[(（].*[)）]$/u, "")
		.trim();
}

function withStandsFor(
	entries: readonly IngredientCatalogEntry[],
): IngredientCatalogEntry[] {
	return entries.map((item) => ({
		...item,
		standsFor: item.standsFor ?? [freshNameFromFrozenName(item.name)],
	}));
}

export const frozenVegetablesEntries: readonly IngredientCatalogEntry[] =
	withDefaultCategory(
		"frozen",
		withStandsFor([
			entry({
				id: "frozen-onion-minced",
				name: "冷凍玉ねぎ(みじん切り)",
				aliases: [
					"冷凍玉ねぎ(みじん切り)",
					"冷凍みじん切り玉ねぎ",
					"冷凍玉ねぎみじん切り",
				],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-onion-strips",
				name: "冷凍玉ねぎ(短冊)",
				aliases: ["冷凍玉ねぎ(短冊)", "冷凍短冊玉ねぎ", "冷凍玉ねぎスライス"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-potato-chunks",
				name: "冷凍じゃがいも(乱切り)",
				aliases: ["冷凍じゃがいも(乱切り)", "冷凍じゃがいも", "冷凍ジャガイモ"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-fries-shoestring",
				standsFor: [],
				name: "冷凍ポテト(シューストリング)",
				aliases: [
					"冷凍ポテト(シューストリング)",
					"冷凍フライドポテト(シューストリング)",
					"シューストリングポテト",
				],
				stockUnitCode: "g",
				presets: frozenBag(1000),
			}),
			entry({
				id: "frozen-fries-natural",
				standsFor: [],
				name: "冷凍ポテト(ナチュラルカット)",
				aliases: [
					"冷凍ポテト(ナチュラルカット)",
					"冷凍フライドポテト(ナチュラルカット)",
					"ナチュラルカットポテト",
					"ナチュラルウェッジポテト",
				],
				stockUnitCode: "g",
				presets: frozenBag(1000),
			}),
			entry({
				id: "frozen-fries-crinkle",
				standsFor: [],
				name: "冷凍ポテト(クリンクルカット)",
				aliases: [
					"冷凍ポテト(クリンクルカット)",
					"冷凍フライドポテト(クリンクルカット)",
					"クリンクルカットポテト",
				],
				stockUnitCode: "g",
				presets: frozenBag(1000),
			}),
			entry({
				id: "frozen-hash-browns",
				standsFor: [],
				name: "冷凍ハッシュドポテト",
				aliases: ["冷凍ハッシュドポテト", "ハッシュドポテト"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-eggplant-chunks",
				name: "冷凍なす(乱切り)",
				aliases: [
					"冷凍なす(乱切り)",
					"冷凍茄子(乱切り)",
					"冷凍ナス(乱切り)",
					"揚げ茄子",
				],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-eggplant-whole",
				name: "冷凍なす(皮むき丸ごと)",
				aliases: [
					"冷凍なす(皮むき丸ごと)",
					"冷凍茄子(皮むき)",
					"冷凍ナス(皮むき)",
					"冷凍なす(皮むき)",
				],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-okra-cut",
				name: "冷凍オクラ(カット)",
				aliases: ["冷凍オクラ(カット)", "冷凍カットオクラ", "冷凍刻みオクラ"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-okra-whole",
				name: "冷凍オクラ(ホール)",
				aliases: ["冷凍オクラ(ホール)", "冷凍オクラ"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-broccoli",
				name: "冷凍ブロッコリー",
				aliases: ["冷凍ブロッコリー"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-cauliflower",
				name: "冷凍カリフラワー",
				aliases: ["冷凍カリフラワー"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-spinach-cut",
				name: "冷凍ほうれん草(カット)",
				aliases: [
					"冷凍ほうれん草(カット)",
					"冷凍ほうれん草",
					"冷凍ホウレンソウ",
				],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-komatsuna",
				name: "冷凍小松菜",
				aliases: ["冷凍小松菜", "冷凍こまつな"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-kabocha",
				name: "冷凍かぼちゃ(カット)",
				aliases: ["冷凍かぼちゃ(カット)", "冷凍かぼちゃ", "冷凍カボチャ"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-sweet-potato",
				name: "冷凍さつまいも(カット)",
				aliases: ["冷凍さつまいも(カット)", "冷凍さつまいも", "冷凍サツマイモ"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-taro",
				name: "冷凍里芋",
				aliases: ["冷凍里芋", "冷凍さといも"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-carrot",
				name: "冷凍にんじん(カット)",
				aliases: ["冷凍にんじん(カット)", "冷凍にんじん", "冷凍人参"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-burdock",
				name: "冷凍ごぼう(ささがき)",
				aliases: ["冷凍ごぼう(ささがき)", "冷凍ごぼう", "冷凍ささがきごぼう"],
				stockUnitCode: "g",
				presets: frozenBag(300),
			}),
			entry({
				id: "frozen-edamame",
				name: "冷凍枝豆(さや付き)",
				aliases: ["冷凍枝豆(さや付き)", "冷凍枝豆", "冷凍えだまめ"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-green-beans",
				name: "冷凍いんげん(カット)",
				aliases: ["冷凍いんげん(カット)", "冷凍いんげん", "冷凍インゲン"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-green-peas",
				name: "冷凍グリーンピース",
				aliases: ["冷凍グリーンピース"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-corn",
				standsFor: ["とうもろこし"],
				name: "冷凍コーン",
				aliases: ["冷凍コーン", "冷凍スイートコーン"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-mixed-vegetables",
				standsFor: [],
				name: "冷凍ミックスベジタブル",
				aliases: ["冷凍ミックスベジタブル", "ミックスベジタブル"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
			entry({
				id: "frozen-chopped-green-onion",
				standsFor: ["ねぎ", "小ねぎ"],
				name: "冷凍きざみねぎ",
				aliases: ["冷凍きざみねぎ", "冷凍刻みねぎ", "冷凍ねぎ", "冷凍小口ねぎ"],
				stockUnitCode: "g",
				presets: frozenBag(300),
			}),
			entry({
				id: "frozen-mushroom-mix",
				standsFor: [],
				name: "冷凍きのこミックス",
				aliases: ["冷凍きのこミックス", "冷凍きのこ", "冷凍キノコ"],
				stockUnitCode: "g",
				presets: frozenBag(500),
			}),
		]),
	);
