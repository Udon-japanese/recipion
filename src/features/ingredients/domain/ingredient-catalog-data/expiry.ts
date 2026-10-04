import type { IngredientExpiryInfo } from "../ingredient-catalog";

// 食材ごとの、期限の種類と目安（Gemini に調べてもらい、内容を確認して取り込んだ。2026-10 時点）。
// すべて、安全側（短め）の値。画面では、必ず「約」と表示し、実物の表示を優先する。
//
// - kind: その食材に、一般的に付く期限の種類（use-by 消費期限 / best-before 賞味期限 / none 通常は表示なし）。
// - defaultStorage: 一般的な保存の場所。
// - hasPrintedDate: 店頭で、パックや袋に日付が印字されているのが一般的か。
// - typicalRemainingDays: 印字がある食材で、買った時点で、印字の日付まで、一般的に何日残っているか。
// - shelfLifeDays: 保存方法ごとの、買った日（冷凍した日）から食べきる目安の日数。
//
// 取り込みで直した点（Gemini の回答から）：
// - soba は、このカタログでは乾麺なので、賞味期限・常温・約365日（回答は、生そばの消費期限・冷蔵だった）。
// - cooked-rice は、パック入りのご飯（3食パック）なので、賞味期限・常温（回答は、炊いたご飯の消費期限・冷蔵1日だった）。
const R = "room";
const F = "fridge";
const Z = "freezer";

type Row = [
	kind: IngredientExpiryInfo["kind"],
	defaultStorage: IngredientExpiryInfo["defaultStorage"],
	hasPrintedDate: boolean,
	typicalRemainingDays: number | null,
	shelfLifeDays: IngredientExpiryInfo["shelfLifeDays"],
];

const U = "use-by";
const B = "best-before";
const N = "none";

// 冷蔵・印字ありの、傷みやすい食材（買った時点の残り日数だけ。冷凍の日数を、足すものもある）。
const frozenFood = [B, Z, true, null, { freezer: 90 }] satisfies Row;
const longLifePantry = (days: number) =>
	[B, R, true, days, { room: days }] satisfies Row;
const rawMeat = (remaining: number, freezer: number) =>
	[U, F, true, remaining, { freezer }] satisfies Row;
const freshProduce = (
	storage: "room" | "fridge",
	shelf: IngredientExpiryInfo["shelfLifeDays"],
) => [N, storage, false, null, shelf] satisfies Row;
const noExpiry = [N, R, false, null, {}] satisfies Row;

const rows: Record<string, Row> = {
	// 卵・乳製品
	egg: [B, F, true, 14, {}],
	"hot-spring-egg": [B, F, true, 10, {}],
	"quail-egg": [B, F, true, 14, {}],
	milk: [U, F, true, 7, {}],
	"low-fat-milk": [U, F, true, 7, {}],
	"nonfat-milk": [U, F, true, 7, {}],
	"whole-milk": [U, F, true, 7, {}],
	yogurt: [B, F, true, 14, {}],
	"sliced-cheese": [B, F, true, 60, {}],
	"parmesan-powder": longLifePantry(120),
	"cream-cheese": [B, F, true, 60, {}],
	butter: [B, F, true, 120, {}],
	"fresh-cream": [U, F, true, 7, {}],

	// 大豆製品・練り物
	"tofu-momen": [U, F, true, 3, {}],
	"tofu-kinu": [U, F, true, 3, {}],
	"fried-tofu-thin": rawMeat(3, 30),
	"fried-tofu-thick": rawMeat(3, 30),
	natto: [B, F, true, 7, { freezer: 30 }],
	"soy-milk": longLifePantry(60),
	chikuwa: rawMeat(5, 30),
	kamaboko: [U, F, true, 5, {}],
	konnyaku: longLifePantry(30),
	shirataki: longLifePantry(30),

	// 肉・魚介
	"chicken-thigh": rawMeat(2, 30),
	"chicken-breast": rawMeat(2, 30),
	"chicken-tenderloin": rawMeat(2, 30),
	"chicken-wing-tip": rawMeat(2, 30),
	"chicken-drumette": rawMeat(2, 30),
	"pork-belly": rawMeat(2, 30),
	pork: rawMeat(2, 30),
	"pork-loin": rawMeat(2, 30),
	"pork-shoulder-loin": rawMeat(2, 30),
	"pork-leg": rawMeat(2, 30),
	beef: rawMeat(3, 30),
	"mixed-ground-meat": rawMeat(1, 20),
	"ground-chicken": rawMeat(1, 20),
	"ground-pork": rawMeat(1, 20),
	bacon: rawMeat(10, 30),
	sausage: rawMeat(10, 30),
	salmon: rawMeat(2, 20),
	"tuna-can": longLifePantry(365),
	"cod-roe": rawMeat(4, 30),
	shrimp: rawMeat(1, 20),
	squid: rawMeat(1, 20),
	clam: [U, F, true, 1, {}],
	"canned-mackerel": longLifePantry(365),
	shirasu: rawMeat(3, 20),
	"bonito-tataki": [U, F, true, 1, {}],

	// 野菜・きのこ（通常、期限の表示がない）
	onion: freshProduce(R, { room: 14, fridge: 21 }),
	potato: freshProduce(R, { room: 14, fridge: 21 }),
	carrot: freshProduce(F, { fridge: 14 }),
	cabbage: freshProduce(F, { fridge: 14 }),
	spinach: freshProduce(F, { fridge: 5 }),
	tomato: freshProduce(F, { fridge: 7 }),
	"cherry-tomato": freshProduce(F, { fridge: 7 }),
	"bell-pepper": freshProduce(F, { fridge: 7 }),
	"green-pepper": freshProduce(F, { fridge: 7 }),
	eggplant: freshProduce(F, { fridge: 5 }),
	cucumber: freshProduce(F, { fridge: 5 }),
	"long-onion": freshProduce(F, { fridge: 10 }),
	"green-onion": freshProduce(F, { fridge: 5 }),
	garlic: freshProduce(R, { room: 21, fridge: 30 }),
	ginger: freshProduce(F, { fridge: 14 }),
	lemon: freshProduce(F, { fridge: 14 }),
	perilla: freshProduce(F, { fridge: 5 }),
	shimeji: freshProduce(F, { fridge: 7 }),
	eringi: freshProduce(F, { fridge: 7 }),
	kimchi: [B, F, true, 20, {}],
	daikon: freshProduce(F, { fridge: 14 }),
	"napa-cabbage": freshProduce(F, { fridge: 10 }),
	"bean-sprouts": [U, F, true, 2, {}],
	broccoli: freshProduce(F, { fridge: 7 }),
	lettuce: freshProduce(F, { fridge: 5 }),
	"sweet-potato": freshProduce(R, { room: 14 }),
	kabocha: freshProduce(R, { room: 14, fridge: 21 }),
	burdock: freshProduce(F, { fridge: 14 }),
	"lotus-root": freshProduce(F, { fridge: 7 }),
	enoki: freshProduce(F, { fridge: 5 }),
	shiitake: freshProduce(F, { fridge: 7 }),
	maitake: freshProduce(F, { fridge: 5 }),

	// 冷凍野菜・冷凍食品（家庭の冷凍庫での目安。購入後2〜3か月）
	"frozen-onion-minced": frozenFood,
	"frozen-onion-strips": frozenFood,
	"frozen-potato-chunks": frozenFood,
	"frozen-fries-shoestring": frozenFood,
	"frozen-fries-natural": frozenFood,
	"frozen-fries-crinkle": frozenFood,
	"frozen-hash-browns": frozenFood,
	"frozen-eggplant-chunks": frozenFood,
	"frozen-eggplant-whole": frozenFood,
	"frozen-okra-cut": frozenFood,
	"frozen-okra-whole": frozenFood,
	"frozen-broccoli": frozenFood,
	"frozen-cauliflower": frozenFood,
	"frozen-spinach-cut": frozenFood,
	"frozen-komatsuna": frozenFood,
	"frozen-kabocha": frozenFood,
	"frozen-sweet-potato": frozenFood,
	"frozen-taro": frozenFood,
	"frozen-carrot": frozenFood,
	"frozen-burdock": frozenFood,
	"frozen-edamame": frozenFood,
	"frozen-green-beans": frozenFood,
	"frozen-green-peas": frozenFood,
	"frozen-corn": frozenFood,
	"frozen-mixed-vegetables": frozenFood,
	"frozen-chopped-green-onion": frozenFood,
	"frozen-mushroom-mix": frozenFood,
	"frozen-udon": frozenFood,

	// 主食・麺・缶詰
	spaghetti: longLifePantry(365),
	somen: longLifePantry(365),
	"cooked-rice": [B, R, true, 180, { room: 180, freezer: 30 }],
	mochi: longLifePantry(180),
	bread: [B, R, true, 3, { freezer: 14 }],
	bun: [B, R, true, 3, { freezer: 14 }],
	"boiled-udon": [U, F, true, 3, { freezer: 14 }],
	soba: longLifePantry(365),
	"chinese-noodles": [U, F, true, 5, { freezer: 14 }],
	macaroni: longLifePantry(365),
	"canned-tomato": longLifePantry(365),
	"cut-tomato-can": longLifePantry(365),
	"whole-tomato-can": longLifePantry(365),

	// 乾物・海藻・ごま
	nori: longLifePantry(180),
	"bonito-flakes": longLifePantry(180),
	"dried-wakame": longLifePantry(180),
	kombu: longLifePantry(180),
	harusame: longLifePantry(365),
	"dried-hijiki": longLifePantry(180),
	"kiriboshi-daikon": longLifePantry(180),
	"white-sesame": longLifePantry(120),
	"black-sesame": longLifePantry(120),

	// 塩・砂糖・ワイン（期限の表示が省略できる）
	salt: noExpiry,
	"coarse-salt": noExpiry,
	"rock-salt": noExpiry,
	sugar: noExpiry,
	"granulated-sugar": noExpiry,
	"brown-sugar-sanontou": noExpiry,
	"kibi-sugar": noExpiry,
	kokuto: noExpiry,
	"white-wine": noExpiry,
	"red-wine": noExpiry,

	// 粉・スパイス・だしの素・ルー・調味料・油
	"magic-salt": longLifePantry(180),
	"salt-and-pepper": longLifePantry(180),
	oligosaccharide: longLifePantry(180),
	"black-pepper": longLifePantry(180),
	"coarse-black-pepper": longLifePantry(180),
	pepper: longLifePantry(180),
	nutmeg: longLifePantry(180),
	"chili-pepper": longLifePantry(180),
	"wheat-flour": longLifePantry(180),
	"medium-flour": longLifePantry(180),
	"bread-flour": longLifePantry(180),
	"potato-starch": longLifePantry(180),
	"bread-crumbs": longLifePantry(90),
	"fresh-bread-crumbs": [U, F, true, 7, { freezer: 30 }],
	"hotcake-mix": longLifePantry(180),
	"chicken-stock-powder": longLifePantry(180),
	consomme: longLifePantry(180),
	"dashi-powder": longLifePantry(180),
	"curry-roux": longLifePantry(180),
	"stew-roux": longLifePantry(180),
	"soy-sauce": longLifePantry(180),
	"usukuchi-soy-sauce": longLifePantry(180),
	"tamari-soy-sauce": longLifePantry(180),
	"dashi-soy-sauce": longLifePantry(180),
	vinegar: longLifePantry(365),
	"rice-vinegar": longLifePantry(365),
	"black-vinegar": longLifePantry(365),
	"apple-vinegar": longLifePantry(365),
	"sushi-vinegar": longLifePantry(180),
	sake: longLifePantry(180),
	"cooking-sake": longLifePantry(180),
	mirin: longLifePantry(180),
	miso: [B, F, true, 90, {}],
	"red-miso": [B, F, true, 90, {}],
	"white-miso": [B, F, true, 90, {}],
	"dashi-miso": [B, F, true, 90, {}],
	mentsuyu: longLifePantry(180),
	"shiro-dashi": longLifePantry(180),
	ponzu: longLifePantry(180),
	ketchup: longLifePantry(180),
	mayonnaise: longLifePantry(180),
	"worcester-sauce": longLifePantry(180),
	"chuno-sauce": longLifePantry(180),
	"tonkatsu-sauce": longLifePantry(180),
	"oyster-sauce": longLifePantry(180),
	doubanjiang: longLifePantry(180),
	gochujang: longLifePantry(180),
	"garlic-tube": longLifePantry(120),
	"ginger-grated": longLifePantry(120),
	"mustard-tube": longLifePantry(120),
	"wasabi-tube": longLifePantry(120),
	"vanilla-essence": longLifePantry(365),
	water: longLifePantry(365),
	"lemon-juice": longLifePantry(180),
	"olive-oil": longLifePantry(180),
	"salad-oil": longLifePantry(180),
	"sesame-oil": longLifePantry(180),
	"white-sesame-oil": longLifePantry(180),
};

export const ingredientExpiryById: Readonly<
	Record<string, IngredientExpiryInfo>
> = Object.fromEntries(
	Object.entries(rows).map(
		([
			id,
			[
				kind,
				defaultStorage,
				hasPrintedDate,
				typicalRemainingDays,
				shelfLifeDays,
			],
		]) => [
			id,
			{
				kind,
				defaultStorage,
				hasPrintedDate,
				typicalRemainingDays,
				shelfLifeDays,
			},
		],
	),
);
