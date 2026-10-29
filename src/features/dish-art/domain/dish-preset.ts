import type { DishPlacement } from "./dish-cover";

export type DishPreset = {
	id: string;
	label: string;
	// レシピ名にこの言葉が入っていれば選ぶ。並びの先のものが優先。
	keywords: readonly string[];
	placements: readonly DishPlacement[];
};

const teishoku: DishPreset = {
	id: "teishoku",
	label: "定食",
	keywords: ["定食", "焼き魚", "ごはん", "ご飯"],
	placements: [
		{ partId: "rice", x: 28, y: 50, scale: 0.55 },
		{ partId: "donburi", x: 28, y: 66, scale: 0.62 },
		{ partId: "miso-soup", x: 74, y: 62, scale: 0.5, tint: "#3f6fa3" },
		{ partId: "grilled-fish", x: 40, y: 82, scale: 0.55, rotate: -6 },
		{ partId: "greens", x: 80, y: 84, scale: 0.34 },
	],
};

const curry: DishPreset = {
	id: "curry",
	label: "カレー",
	keywords: ["カレー", "ハヤシ", "シチュー"],
	placements: [
		{ partId: "deep-plate", x: 50, y: 58, scale: 1, tint: "#e6dfcb" },
		{ partId: "rice", x: 34, y: 50, scale: 0.55 },
		{ partId: "curry", x: 62, y: 52, scale: 0.55 },
		{ partId: "spoon", x: 50, y: 76, scale: 0.5 },
	],
};

const hiyayakko: DishPreset = {
	id: "hiyayakko",
	label: "冷奴",
	keywords: ["豆腐", "冷奴", "冷や奴"],
	placements: [
		{ partId: "plate", x: 50, y: 60, scale: 0.95, tint: "#3f6fa3" },
		{ partId: "tofu", x: 50, y: 50, scale: 0.55 },
		{ partId: "negi", x: 50, y: 34, scale: 0.28 },
		{ partId: "soy-dish", x: 80, y: 76, scale: 0.34 },
		{ partId: "chopsticks", x: 30, y: 80, scale: 0.5 },
	],
};

const karaage: DishPreset = {
	id: "karaage",
	label: "揚げ物",
	keywords: ["唐揚げ", "から揚げ", "唐あげ", "揚げ", "フライ", "天ぷら"],
	placements: [
		{ partId: "plate", x: 50, y: 62, scale: 0.95, tint: "#e6dfcb" },
		{ partId: "karaage", x: 44, y: 52, scale: 0.55 },
		{ partId: "greens", x: 74, y: 48, scale: 0.32 },
		{ partId: "lemon", x: 72, y: 66, scale: 0.28, rotate: -10 },
	],
};

const salad: DishPreset = {
	id: "salad",
	label: "サラダ",
	keywords: ["サラダ", "和え", "マリネ", "ナムル"],
	placements: [
		{ partId: "deep-plate", x: 50, y: 58, scale: 0.98, tint: "#e6dfcb" },
		{ partId: "greens", x: 44, y: 46, scale: 0.5 },
		{ partId: "tomato", x: 66, y: 48, scale: 0.3 },
		{ partId: "tomato", x: 30, y: 52, scale: 0.28 },
		{ partId: "boiled-egg", x: 52, y: 52, scale: 0.3 },
		{ partId: "cucumber", x: 70, y: 56, scale: 0.28 },
	],
};

const ramen: DishPreset = {
	id: "ramen",
	label: "麺",
	keywords: ["ラーメン", "麺", "うどん", "そば", "パスタ", "そうめん"],
	placements: [
		{ partId: "noodles", x: 50, y: 40, scale: 0.85 },
		{ partId: "donburi", x: 50, y: 56, scale: 0.95, tint: "#3f6fa3" },
		{ partId: "tamagoyaki", x: 38, y: 40, scale: 0.3 },
		{ partId: "greens", x: 66, y: 36, scale: 0.26 },
	],
};

const tamagoDon: DishPreset = {
	id: "tamago-don",
	label: "丼",
	keywords: ["丼", "どんぶり", "卵とじ", "玉子とじ"],
	placements: [
		{ partId: "rice", x: 50, y: 38, scale: 0.8 },
		{ partId: "donburi", x: 50, y: 56, scale: 0.95 },
		{ partId: "tamagoyaki", x: 50, y: 36, scale: 0.6 },
		{ partId: "greens", x: 74, y: 30, scale: 0.28, rotate: 20 },
	],
};

const breakfast: DishPreset = {
	id: "breakfast",
	label: "パン",
	keywords: ["トースト", "パン", "サンド"],
	placements: [
		{ partId: "plate", x: 38, y: 62, scale: 0.8, tint: "#e6dfcb" },
		{ partId: "shokupan", x: 38, y: 52, scale: 0.46 },
		{ partId: "mug", x: 78, y: 62, scale: 0.55, tint: "#d9573f" },
	],
};

const nabe: DishPreset = {
	id: "nabe",
	label: "鍋・汁もの",
	keywords: ["鍋", "煮", "スープ", "汁", "おでん", "炒め"],
	placements: [
		{ partId: "pot", x: 50, y: 56, scale: 0.9, tint: "#e6dfcb" },
		{ partId: "carrot", x: 30, y: 28, scale: 0.4 },
		{ partId: "shiitake", x: 52, y: 22, scale: 0.34 },
		{ partId: "negi", x: 74, y: 26, scale: 0.38 },
	],
};

const eggBreakfast: DishPreset = {
	id: "egg-breakfast",
	label: "卵料理",
	keywords: ["卵", "玉子", "たまご", "目玉焼き", "オムレツ", "ウインナー"],
	placements: [
		{ partId: "plate", x: 50, y: 62, scale: 0.95, tint: "#3f6fa3" },
		{ partId: "fried-egg", x: 40, y: 54, scale: 0.5 },
		{ partId: "sausage", x: 66, y: 48, scale: 0.4, rotate: -20 },
		{ partId: "sausage", x: 68, y: 60, scale: 0.4, rotate: -8 },
	],
};

// 名前に合う言葉があれば、先に並べたものを選ぶ。どれにも合わなければ、定食。
export const dishPresets: readonly DishPreset[] = [
	curry,
	hiyayakko,
	karaage,
	salad,
	ramen,
	tamagoDon,
	breakfast,
	nabe,
	eggBreakfast,
	teishoku,
];

export function pickDishPreset(recipeName: string): DishPreset {
	return (
		dishPresets.find((preset) =>
			preset.keywords.some((keyword) => recipeName.includes(keyword)),
		) ?? teishoku
	);
}
