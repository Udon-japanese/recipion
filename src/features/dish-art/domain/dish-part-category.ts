import { dishParts } from "./dish-part";

export type DishPartCategory = {
	id: string;
	label: string;
	partIds: readonly string[];
};

// 部品の棚の分け方。すべての部品が、どれか1つに入る（テストで確かめる）。
export const dishPartCategories: readonly DishPartCategory[] = [
	{
		id: "staple",
		label: "ごはん・器",
		partIds: [
			"rice",
			"donburi",
			"miso-soup",
			"plate",
			"deep-plate",
			"pot",
			"frying-pan",
			"mug",
			"glass",
			"zaru",
			"onigiri",
			"noodles",
			"inari",
			"nigiri",
			"fried-rice",
		],
	},
	{
		id: "protein",
		label: "肉・魚・卵",
		partIds: [
			"grilled-fish",
			"fish-fillet",
			"sashimi",
			"shrimp",
			"squid",
			"steak",
			"sliced-meat",
			"minced-meat",
			"sausage",
			"drumstick",
			"kakuni",
			"chikuwa",
			"tamagoyaki",
			"fried-egg",
			"boiled-egg",
			"raw-egg",
			"tofu",
		],
	},
	{
		id: "vegetable",
		label: "野菜",
		partIds: [
			"greens",
			"cabbage",
			"tomato",
			"carrot",
			"potato",
			"onion",
			"cucumber",
			"broccoli",
			"shiitake",
			"pumpkin",
			"negi",
			"eggplant",
			"pepper",
			"corn",
			"daikon",
			"bean-sprouts",
		],
	},
	{
		id: "main",
		label: "主菜",
		partIds: [
			"karaage",
			"katsu",
			"ebi-fry",
			"hamburger",
			"gyoza",
			"shumai",
			"harumaki",
			"okonomiyaki",
			"takoyaki",
			"omelet",
			"curry",
		],
	},
	{
		id: "bread",
		label: "パン・粉もの",
		partIds: [
			"shokupan",
			"roll",
			"sandwich",
			"pizza",
			"pancake",
			"nikuman",
			"bun-top",
			"bun-bottom",
			"hotdog-bun",
		],
	},
	{
		id: "garnish",
		label: "薬味・道具",
		partIds: [
			"mascot",
			"lemon",
			"sauce",
			"soy-dish",
			"sesame",
			"nori",
			"umeboshi",
			"cheese",
			"chopsticks",
			"spoon",
			"fork",
		],
	},
];

// 棚に並べるための、部品の一覧（見つからない ID は除く）。
export function partsInCategory(category: DishPartCategory) {
	return dishParts.filter((part) => category.partIds.includes(part.id));
}
