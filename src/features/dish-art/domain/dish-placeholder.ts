import type { DishPlacement } from "./dish-cover";

// 絵を付けていないレシピに出す、れしぽよの絵。何種類かの中から、レシピごとに決まったものを出す。
export const dishPlaceholders: readonly (readonly DishPlacement[])[] = [
	// ごはんといっしょ。
	[
		{ partId: "mascot", x: 36, y: 50, scale: 0.9 },
		{ partId: "rice", x: 74, y: 62, scale: 0.45 },
		{ partId: "donburi", x: 74, y: 75, scale: 0.5 },
	],
	// スプーンを持って。
	[
		{ partId: "mascot", x: 42, y: 54, scale: 0.9 },
		{ partId: "spoon", x: 76, y: 62, scale: 0.6, rotate: -25 },
	],
	// おにぎり。
	[
		{ partId: "mascot", x: 38, y: 52, scale: 0.85 },
		{ partId: "onigiri", x: 76, y: 56, scale: 0.42 },
	],
	// お皿に乗って、お皿の下にフォーク。
	[
		{ partId: "plate", x: 50, y: 50, scale: 0.9, tint: "#e6dfcb" },
		{ partId: "mascot", x: 50, y: 38, scale: 0.7 },
		{ partId: "fork", x: 50, y: 86, scale: 0.6 },
	],
	// パンとカップ。
	[
		{ partId: "mascot", x: 36, y: 54, scale: 0.8 },
		{ partId: "shokupan", x: 66, y: 52, scale: 0.4, rotate: 14 },
		{ partId: "mug", x: 76, y: 76, scale: 0.4, tint: "#d9573f" },
	],
	// 鍋からのぞく。
	[
		{ partId: "mascot", x: 34, y: 48, scale: 0.85 },
		{ partId: "pot", x: 70, y: 66, scale: 0.65, tint: "#e6dfcb" },
	],
];

function hashSeed(seed: string): number {
	let hash = 5381;

	for (const character of seed) {
		hash = (hash * 33 + (character.codePointAt(0) ?? 0)) % 2_147_483_647;
	}

	return hash;
}

// seed（レシピの識別子など）から、いつも同じ1つを選ぶ。
export function pickDishPlaceholder(seed: string): readonly DishPlacement[] {
	return (
		dishPlaceholders[hashSeed(seed) % dishPlaceholders.length] ??
		dishPlaceholders[0] ??
		[]
	);
}
