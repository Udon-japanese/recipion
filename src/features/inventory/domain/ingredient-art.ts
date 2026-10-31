import type { DishPlacement } from "#/features/dish-art/domain/dish-cover";
import { findIngredientCatalogEntry } from "#/features/ingredients/domain/ingredient-catalog";
import type { ShoppingCategoryId } from "#/features/shopping/domain/shopping-category";

type IngredientArt = {
	// 料理の絵の部品の ID（dish-part.ts）。
	partId: string;
	// 部品の色の差し替え（醤油の瓶を濃い茶にする、など）。
	tint?: string;
};

const shoyu = "#3a2418";
const vinegar = "#e8c97a";
const oil = "#e0b030";
const sauceBrown = "#5b3524";
const chiliRed = "#d9402f";
const ketchupRed = "#e0452f";
const citrusYellow = "#f4cf3d";

// 在庫の絵：カタログの食材 ID → 料理の絵の部品。
// 名前の部分一致では引かない（「餃子の皮」が餃子の絵になる、のような間違いを避けるため）。
// ここにない食材は、カテゴリの寄せ集め（下の clusters）になる。
const artByCatalogId: Record<string, IngredientArt> = {
	// 卵・乳製品
	egg: { partId: "raw-egg" },
	"hot-spring-egg": { partId: "onsen-egg" },
	"quail-egg": { partId: "quail-egg" },
	milk: { partId: "milk-carton" },
	"low-fat-milk": { partId: "milk-carton" },
	"nonfat-milk": { partId: "milk-carton" },
	"whole-milk": { partId: "milk-carton" },
	"soy-milk": { partId: "milk-carton", tint: "#58ad6e" },
	"fresh-cream": { partId: "milk-carton", tint: ketchupRed },
	yogurt: { partId: "yogurt" },
	"sliced-cheese": { partId: "cheese" },
	"cream-cheese": { partId: "cheese" },
	"parmesan-powder": { partId: "salt", tint: "#f4e3b0" },
	butter: { partId: "butter" },
	// 大豆・練り物
	"tofu-momen": { partId: "tofu" },
	"tofu-kinu": { partId: "tofu" },
	"fried-tofu-thin": { partId: "aburaage" },
	"fried-tofu-thick": { partId: "atsuage" },
	natto: { partId: "natto" },
	chikuwa: { partId: "chikuwa" },
	kamaboko: { partId: "kamaboko" },
	konnyaku: { partId: "konnyaku" },
	shirataki: { partId: "shirataki" },
	kimchi: { partId: "jar", tint: chiliRed },
	// 肉
	"chicken-thigh": { partId: "drumstick" },
	"chicken-breast": { partId: "chicken-breast" },
	"chicken-tenderloin": { partId: "chicken-breast" },
	"chicken-wing-tip": { partId: "wing" },
	"chicken-drumette": { partId: "wing" },
	"pork-belly": { partId: "pork-belly" },
	pork: { partId: "sliced-meat" },
	"pork-loin": { partId: "sliced-meat" },
	"pork-shoulder-loin": { partId: "sliced-meat" },
	"pork-leg": { partId: "sliced-meat" },
	beef: { partId: "steak" },
	"mixed-ground-meat": { partId: "minced-meat" },
	"ground-chicken": { partId: "minced-meat" },
	"ground-pork": { partId: "minced-meat" },
	bacon: { partId: "bacon" },
	sausage: { partId: "sausage" },
	// 魚介
	salmon: { partId: "fish-fillet" },
	"tuna-can": { partId: "can" },
	"canned-mackerel": { partId: "can" },
	"cod-roe": { partId: "mentaiko" },
	shrimp: { partId: "shrimp" },
	squid: { partId: "squid" },
	clam: { partId: "clam" },
	shirasu: { partId: "shirasu" },
	"bonito-tataki": { partId: "sashimi" },
	// 野菜・きのこ
	onion: { partId: "onion" },
	potato: { partId: "potato" },
	carrot: { partId: "carrot" },
	cabbage: { partId: "cabbage" },
	spinach: { partId: "greens" },
	tomato: { partId: "tomato" },
	"cherry-tomato": { partId: "mini-tomato" },
	"bell-pepper": { partId: "paprika" },
	"green-pepper": { partId: "pepper" },
	eggplant: { partId: "eggplant" },
	cucumber: { partId: "cucumber" },
	"long-onion": { partId: "negi" },
	"green-onion": { partId: "negi" },
	garlic: { partId: "garlic" },
	ginger: { partId: "ginger" },
	lemon: { partId: "lemon" },
	perilla: { partId: "shiso" },
	shimeji: { partId: "shimeji" },
	eringi: { partId: "eringi" },
	daikon: { partId: "daikon" },
	"napa-cabbage": { partId: "hakusai" },
	"bean-sprouts": { partId: "bean-sprouts" },
	broccoli: { partId: "broccoli" },
	lettuce: { partId: "lettuce" },
	"sweet-potato": { partId: "sweet-potato" },
	kabocha: { partId: "pumpkin" },
	burdock: { partId: "burdock" },
	"lotus-root": { partId: "lotus-root" },
	enoki: { partId: "enoki" },
	shiitake: { partId: "shiitake" },
	maitake: { partId: "maitake" },
	// 果物
	apple: { partId: "apple" },
	banana: { partId: "banana" },
	mikan: { partId: "citrus" },
	orange: { partId: "citrus" },
	grapefruit: { partId: "citrus", tint: citrusYellow },
	yuzu: { partId: "citrus", tint: citrusYellow },
	lime: { partId: "citrus", tint: "#8bc34a" },
	kiwi: { partId: "kiwi" },
	pear: { partId: "pear" },
	peach: { partId: "peach" },
	persimmon: { partId: "persimmon" },
	strawberry: { partId: "strawberry" },
	grape: { partId: "grapes" },
	blueberry: { partId: "blueberry" },
	cherry: { partId: "cherry" },
	pineapple: { partId: "pineapple" },
	avocado: { partId: "avocado" },
	// 冷凍
	"frozen-onion-minced": { partId: "onion" },
	"frozen-onion-strips": { partId: "onion" },
	"frozen-potato-chunks": { partId: "potato" },
	"frozen-fries-shoestring": { partId: "french-fries" },
	"frozen-fries-natural": { partId: "french-fries" },
	"frozen-fries-crinkle": { partId: "french-fries" },
	"frozen-hash-browns": { partId: "french-fries" },
	"frozen-eggplant-chunks": { partId: "eggplant" },
	"frozen-eggplant-whole": { partId: "eggplant" },
	"frozen-okra-cut": { partId: "okra" },
	"frozen-okra-whole": { partId: "okra" },
	"frozen-broccoli": { partId: "broccoli" },
	"frozen-cauliflower": { partId: "cauliflower" },
	"frozen-spinach-cut": { partId: "greens" },
	"frozen-komatsuna": { partId: "greens" },
	"frozen-kabocha": { partId: "pumpkin" },
	"frozen-sweet-potato": { partId: "sweet-potato" },
	"frozen-taro": { partId: "taro" },
	"frozen-carrot": { partId: "carrot" },
	"frozen-burdock": { partId: "burdock" },
	"frozen-edamame": { partId: "edamame" },
	"frozen-green-beans": { partId: "green-beans" },
	"frozen-green-peas": { partId: "green-beans" },
	"frozen-corn": { partId: "corn" },
	"frozen-mixed-vegetables": { partId: "mixed-veg" },
	"frozen-chopped-green-onion": { partId: "negi" },
	"frozen-mushroom-mix": { partId: "shimeji" },
	"frozen-udon": { partId: "noodles" },
	// 主食・麺
	spaghetti: { partId: "pasta" },
	somen: { partId: "somen" },
	rice: { partId: "rice-bag" },
	"cooked-rice": { partId: "rice" },
	mochi: { partId: "mochi" },
	bread: { partId: "shokupan" },
	bun: { partId: "hotdog-bun" },
	"boiled-udon": { partId: "noodles" },
	soba: { partId: "soba" },
	"chinese-noodles": { partId: "ramen" },
	macaroni: { partId: "macaroni" },
	// 缶・乾物
	"canned-tomato": { partId: "tomato-can" },
	"cut-tomato-can": { partId: "tomato-can" },
	"whole-tomato-can": { partId: "tomato-can" },
	nori: { partId: "nori" },
	"bonito-flakes": { partId: "katsuobushi" },
	"dried-wakame": { partId: "wakame" },
	kombu: { partId: "kombu" },
	harusame: { partId: "harusame" },
	"dried-hijiki": { partId: "hijiki" },
	"kiriboshi-daikon": { partId: "kiriboshi" },
	"white-sesame": { partId: "sesame" },
	"black-sesame": { partId: "sesame" },
	// 塩・砂糖・香辛料
	salt: { partId: "salt" },
	"coarse-salt": { partId: "salt" },
	"rock-salt": { partId: "salt" },
	"magic-salt": { partId: "salt" },
	"salt-and-pepper": { partId: "pepper-grinder" },
	sugar: { partId: "bag", tint: "#3f6fa3" },
	"granulated-sugar": { partId: "bag", tint: "#3f6fa3" },
	"brown-sugar-sanontou": { partId: "bag", tint: "#c98a3a" },
	"kibi-sugar": { partId: "bag", tint: "#c98a3a" },
	kokuto: { partId: "bag", tint: sauceBrown },
	oligosaccharide: { partId: "squeeze-bottle", tint: vinegar },
	"black-pepper": { partId: "pepper-grinder" },
	"coarse-black-pepper": { partId: "pepper-grinder" },
	pepper: { partId: "pepper-grinder" },
	nutmeg: { partId: "jar", tint: "#8a5a2b" },
	"chili-pepper": { partId: "jar", tint: chiliRed },
	// 粉・ルー・だし
	"wheat-flour": { partId: "bag", tint: chiliRed },
	"medium-flour": { partId: "bag", tint: chiliRed },
	"bread-flour": { partId: "bag", tint: chiliRed },
	"potato-starch": { partId: "bag", tint: "#58ad6e" },
	"bread-crumbs": { partId: "breadcrumbs" },
	"fresh-bread-crumbs": { partId: "breadcrumbs" },
	"hotcake-mix": { partId: "pancake-mix" },
	"chicken-stock-powder": { partId: "stock-cubes" },
	consomme: { partId: "stock-cubes" },
	"dashi-powder": { partId: "stock-cubes" },
	"curry-roux": { partId: "roux" },
	"stew-roux": { partId: "roux" },
	// 調味料
	"soy-sauce": { partId: "bottle", tint: shoyu },
	"usukuchi-soy-sauce": { partId: "bottle", tint: shoyu },
	"tamari-soy-sauce": { partId: "bottle", tint: shoyu },
	"dashi-soy-sauce": { partId: "bottle", tint: shoyu },
	vinegar: { partId: "bottle", tint: vinegar },
	"rice-vinegar": { partId: "bottle", tint: vinegar },
	"black-vinegar": { partId: "bottle", tint: shoyu },
	"apple-vinegar": { partId: "bottle", tint: vinegar },
	"sushi-vinegar": { partId: "bottle", tint: vinegar },
	sake: { partId: "bottle", tint: "#e6f1f4" },
	"cooking-sake": { partId: "bottle", tint: "#e6f1f4" },
	mirin: { partId: "bottle", tint: oil },
	"white-wine": { partId: "bottle", tint: "#d8cf7a" },
	"red-wine": { partId: "bottle", tint: "#6a1f2f" },
	miso: { partId: "miso-tub" },
	"red-miso": { partId: "miso-tub" },
	"white-miso": { partId: "miso-tub" },
	"dashi-miso": { partId: "miso-tub" },
	mentsuyu: { partId: "bottle", tint: "#c98a3a" },
	"shiro-dashi": { partId: "bottle", tint: oil },
	ponzu: { partId: "bottle", tint: "#c98a3a" },
	ketchup: { partId: "squeeze-bottle", tint: ketchupRed },
	mayonnaise: { partId: "squeeze-bottle", tint: "#fff2cf" },
	"worcester-sauce": { partId: "bottle", tint: sauceBrown },
	"chuno-sauce": { partId: "squeeze-bottle", tint: sauceBrown },
	"tonkatsu-sauce": { partId: "squeeze-bottle", tint: sauceBrown },
	"oyster-sauce": { partId: "bottle", tint: shoyu },
	doubanjiang: { partId: "jar", tint: chiliRed },
	gochujang: { partId: "jar", tint: chiliRed },
	"garlic-tube": { partId: "tube", tint: "#f6efe0" },
	"ginger-grated": { partId: "tube", tint: "#f0d58a" },
	"mustard-tube": { partId: "tube", tint: "#f4b81c" },
	"wasabi-tube": { partId: "tube", tint: "#58ad6e" },
	"vanilla-essence": { partId: "bottle", tint: shoyu },
	water: { partId: "water-bottle" },
	"lemon-juice": { partId: "bottle", tint: citrusYellow },
	"olive-oil": { partId: "bottle", tint: "#8bb04a" },
	"salad-oil": { partId: "bottle", tint: oil },
	"sesame-oil": { partId: "bottle", tint: "#c98a3a" },
	"white-sesame-oil": { partId: "bottle", tint: oil },
};

// 表にない食材は、そのカテゴリの食材をいくつか寄せ集めた絵にする（部品の ID と、位置 %）。
const clusters: Record<ShoppingCategoryId, [string, number, number][]> = {
	produce: [
		["tomato", 33, 60],
		["carrot", 67, 58],
		["greens", 50, 34],
	],
	meat: [
		["sliced-meat", 34, 58],
		["fish-fillet", 66, 56],
		["sausage", 50, 32],
	],
	dairy: [
		["raw-egg", 34, 60],
		["cheese", 66, 58],
		["glass", 50, 32],
	],
	chilled: [
		["tofu", 34, 58],
		["natto", 66, 58],
		["inari", 50, 32],
	],
	pantry: [
		["soy-dish", 34, 58],
		["sauce", 66, 58],
		["sesame", 50, 32],
	],
	staples: [
		["rice", 34, 58],
		["noodles", 66, 58],
		["shokupan", 50, 32],
	],
	frozen: [
		["gyoza", 34, 58],
		["takoyaki", 66, 58],
		["shumai", 50, 32],
	],
	household: [
		["plate", 34, 58],
		["mug", 66, 58],
		["spoon", 50, 32],
	],
	seafood: [
		["fish-fillet", 34, 58],
		["shrimp", 66, 56],
		["squid", 50, 32],
	],
	eggs: [
		["raw-egg", 34, 58],
		["boiled-egg", 66, 58],
		["fried-egg", 50, 32],
	],
	snacks: [
		["pancake", 34, 58],
		["roll", 66, 58],
		["mug", 50, 32],
	],
	beverages: [
		["glass", 34, 58],
		["mug", 66, 58],
		["lemon", 50, 32],
	],
	deli: [
		["karaage", 34, 58],
		["onigiri", 66, 58],
		["greens", 50, 32],
	],
	bakery: [
		["shokupan", 34, 58],
		["roll", 66, 58],
		["sandwich", 50, 32],
	],
	other: [
		["umeboshi", 34, 58],
		["nori", 66, 58],
		["konnyaku", 50, 32],
	],
};

export const ingredientArtCatalogIds: readonly string[] =
	Object.keys(artByCatalogId);

export const ingredientArtPartIds: readonly string[] = [
	...new Set([
		...Object.values(artByCatalogId).map((art) => art.partId),
		...Object.values(clusters).flatMap((cluster) =>
			cluster.map(([partId]) => partId),
		),
	]),
];

// 食材の名前から、在庫の絵（料理の絵の部品の置き方）を決める。
// 1. 名前からカタログの食材を引き、表にあれば、その部品を1つ大きく置く。
// 2. なければ、そのカテゴリの寄せ集め。カタログにもない名前（自分で付けた食材）は、
//    渡された categoryId（なければ「その他」）の寄せ集め。
export function resolveIngredientArt(
	name: string,
	fallbackCategoryId?: ShoppingCategoryId,
): DishPlacement[] {
	const entry = findIngredientCatalogEntry(name);
	const art = entry ? artByCatalogId[entry.id] : undefined;

	if (art) {
		return [
			{
				partId: art.partId,
				x: 50,
				y: 50,
				scale: 0.92,
				...(art.tint ? { tint: art.tint } : {}),
			},
		];
	}

	const categoryId = entry?.categoryId ?? fallbackCategoryId ?? "other";

	return clusters[categoryId].map(([partId, x, y]) => ({
		partId,
		x,
		y,
		scale: 0.6,
	}));
}
