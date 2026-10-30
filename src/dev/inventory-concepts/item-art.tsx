import {
	DishArt,
	DishArtLayers,
} from "#/features/dish-art/components/dish-art";
import type { DishPlacement } from "#/features/dish-art/domain/dish-cover";
import type { ShoppingCategoryId } from "#/features/shopping/domain/shopping-category";
import type { SampleItem } from "./sample-data";

// 食材の名前に合う、料理の絵の部品（上から順に、最初に当たったもの）。3つ目は、色の選択肢から選ぶ色。
const partByName: [string, string, string?][] = [
	["温泉卵", "onsen-egg"],
	["うずら", "quail-egg"],
	["卵", "raw-egg"],
	["豆乳", "milk-carton", "#58ad6e"],
	["生クリーム", "milk-carton", "#e0452f"],
	["牛乳", "milk-carton"],
	["ヨーグルト", "yogurt"],
	["バター", "butter"],
	["チーズ", "cheese"],
	["豆腐", "tofu"],
	["納豆", "natto"],
	["油揚げ", "aburaage"],
	["厚揚げ", "atsuage"],
	["こんにゃく", "konnyaku"],
	["しらたき", "shirataki"],
	["ちくわ", "chikuwa"],
	["かまぼこ", "kamaboko"],
	["さつま揚げ", "hanpen"],
	["むね肉", "chicken-breast"],
	["ささみ", "chicken-breast"],
	["手羽", "wing"],
	["もも肉", "drumstick"],
	["豚バラ", "pork-belly"],
	["ベーコン", "bacon"],
	["ハム", "ham"],
	["ソーセージ", "sausage"],
	["焼き豚", "sliced-meat"],
	["豚", "sliced-meat"],
	["牛", "steak"],
	["ひき肉", "minced-meat"],
	["鮭", "fish-fillet"],
	["たらこ", "mentaiko"],
	["明太子", "mentaiko"],
	["あさり", "clam"],
	["しらす", "shirasu"],
	["えび", "shrimp"],
	["いか", "squid"],
	["トマト缶", "tomato-can"],
	["缶", "can"],
	["ミニトマト", "mini-tomato"],
	["トマト", "tomato"],
	["パプリカ", "paprika"],
	["大葉", "shiso"],
	["しめじ", "shimeji"],
	["えのき", "enoki"],
	["エリンギ", "eringi"],
	["まいたけ", "maitake"],
	["しいたけ", "shiitake"],
	["にんにく", "garlic"],
	["しょうが", "ginger"],
	["レタス", "lettuce"],
	["白菜", "hakusai"],
	["キャベツ", "cabbage"],
	["さつまいも", "sweet-potato"],
	["じゃがいも", "potato"],
	["ごぼう", "burdock"],
	["れんこん", "lotus-root"],
	["オクラ", "okra"],
	["里芋", "taro"],
	["カリフラワー", "cauliflower"],
	["枝豆", "edamame"],
	["いんげん", "green-beans"],
	["ミックスベジ", "mixed-veg"],
	["ポテト", "french-fries"],
	["玉ねぎ", "onion"],
	["にんじん", "carrot"],
	["ほうれん草", "greens"],
	["小松菜", "greens"],
	["きゅうり", "cucumber"],
	["長ねぎ", "negi"],
	["ブロッコリー", "broccoli"],
	["なす", "eggplant"],
	["かぼちゃ", "pumpkin"],
	["大根", "daikon"],
	["ピーマン", "pepper"],
	["もやし", "bean-sprouts"],
	["コーン", "corn"],
	["レモン", "lemon"],
	["りんご", "apple"],
	["バナナ", "banana"],
	["みかん", "citrus"],
	["オレンジ", "citrus"],
	["グレープフルーツ", "citrus", "#f4cf3d"],
	["ゆず", "citrus", "#f4cf3d"],
	["ライム", "citrus", "#8bc34a"],
	["キウイ", "kiwi"],
	["梨", "pear"],
	["桃", "peach"],
	["柿", "persimmon"],
	["いちご", "strawberry"],
	["ぶどう", "grapes"],
	["ブルーベリー", "blueberry"],
	["さくらんぼ", "cherry"],
	["パイナップル", "pineapple"],
	["アボカド", "avocado"],
	["スパゲティ", "pasta"],
	["パスタ", "pasta"],
	["そうめん", "somen"],
	["そば", "soba"],
	["中華麺", "ramen"],
	["カップ麺", "ramen"],
	["マカロニ", "macaroni"],
	["うどん", "noodles"],
	["もち", "mochi"],
	["食パン", "shokupan"],
	["ご飯", "rice"],
	["冷凍ごはん", "rice"],
	["米酢", "bottle", "#e8c97a"],
	["米", "rice-bag"],
	["餃子", "gyoza"],
	["たこ焼き", "takoyaki"],
	["かつお節", "katsuobushi"],
	["わかめ", "wakame"],
	["昆布", "kombu"],
	["春雨", "harusame"],
	["ひじき", "hijiki"],
	["切り干し", "kiriboshi"],
	["海苔", "nori"],
	["ごま油", "bottle", "#e0b030"],
	["ごま", "sesame"],
	["醤油", "bottle", "#3a2418"],
	["ポン酢", "bottle", "#c98a3a"],
	["めんつゆ", "bottle", "#c98a3a"],
	["みりん", "bottle", "#e0b030"],
	["ワイン", "bottle", "#6a1f2f"],
	["オイル", "bottle", "#e0b030"],
	["ドレッシング", "bottle", "#e8b84a"],
	["酢", "bottle", "#e8c97a"],
	["酒", "bottle", "#e6f1f4"],
	["マヨネーズ", "squeeze-bottle", "#fff2cf"],
	["ケチャップ", "squeeze-bottle", "#e0452f"],
	["マスタード", "squeeze-bottle", "#f0c030"],
	["ソース", "squeeze-bottle", "#5b3524"],
	["味噌", "miso-tub"],
	["ジャム", "jar"],
	["コチュジャン", "jar", "#d9402f"],
	["豆板醤", "jar", "#d9402f"],
	["わさび", "tube", "#58ad6e"],
	["からし", "tube", "#f4b81c"],
	["チューブ", "tube", "#f6efe0"],
	["塩", "salt"],
	["胡椒", "pepper-grinder"],
	["パン粉", "breadcrumbs"],
	["ホットケーキミックス", "pancake-mix"],
	["ホットケーキ", "pancake"],
	["砂糖", "bag", "#3f6fa3"],
	["小麦粉", "bag", "#d9402f"],
	["片栗粉", "bag", "#58ad6e"],
	["コンソメ", "stock-cubes"],
	["だしの素", "stock-cubes"],
	["鶏がら", "stock-cubes"],
	["ルー", "roux"],
	["お茶", "water-bottle", "#58ad6e"],
	["水", "water-bottle"],
	["コーヒー", "mug"],
];

// 名前に合う部品がないときは、そのカテゴリの食材をいくつか寄せ集めた絵にする。
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

export function itemPlacements(item: SampleItem): DishPlacement[] {
	const match = partByName.find(([keyword]) => item.name.includes(keyword));

	if (match) {
		return [
			{
				partId: match[1],
				x: 50,
				y: 50,
				scale: 0.92,
				...(match[2] ? { tint: match[2] } : {}),
			},
		];
	}

	return clusters[item.category].map(([partId, x, y]) => ({
		partId,
		x,
		y,
		scale: 0.6,
	}));
}

// 食材の絵（料理の絵の部品。名前に合うものがなければ、カテゴリの寄せ集め）。
export function ItemArt({ item, size }: { item: SampleItem; size: number }) {
	return <DishArt placements={itemPlacements(item)} size={size} />;
}

// 部屋の絵（svg）の中に、食材の絵を置く。
export function ItemArtAt({
	item,
	x,
	y,
	size,
}: {
	item: SampleItem;
	x: number;
	y: number;
	size: number;
}) {
	return (
		<svg
			x={x - size / 2}
			y={y - size}
			width={size}
			height={size}
			viewBox="0 0 100 100"
			aria-hidden="true"
		>
			<DishArtLayers placements={itemPlacements(item)} />
		</svg>
	);
}

// 庫内の棚に置く、部品そのもの。
export function PartAt({
	partId,
	x,
	y,
	size,
}: {
	partId: string;
	x: number;
	y: number;
	size: number;
}) {
	return (
		<svg
			x={x - size / 2}
			y={y - size}
			width={size}
			height={size}
			viewBox="0 0 100 100"
			aria-hidden="true"
		>
			<DishArtLayers placements={[{ partId, x: 50, y: 50, scale: 0.95 }]} />
		</svg>
	);
}
