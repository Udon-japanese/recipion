// 料理の絵の部品。絵ではなく、図形（円・楕円・角丸の四角・パス）の並びで持つ。
// 座標は 0〜100 の正方形の中。利用者が選べるのは、部品の id と、置き場所・色だけ。
export const dishArtViewSize = 100;

export const dishColors = {
	ink: "#292720",
	white: "#ffffff",
	riceShade: "#ece5d2",
	miso: "#c98a4b",
	tofu: "#fff8e6",
	yolk: "#f4b81c",
	yolkDark: "#e49b0f",
	fish: "#f08f6a",
	fishLight: "#f9c4a8",
	fishBurn: "#a8532e",
	leaf: "#58ad6e",
	leafDark: "#2f7d4a",
	leafLight: "#a5d9a8",
	nori: "#2b3a30",
	crust: "#d9a05b",
	crustLight: "#e9bd7c",
	crumb: "#fbe7b8",
	coffee: "#7a4e2d",
	glass: "#d6ebf3",
	pan: "#4a4640",
	panInner: "#5f5a52",
	meat: "#a8553a",
	meatDark: "#7a3a28",
	meatPink: "#e9a08a",
	fat: "#f8e6d8",
	mince: "#8a4a35",
	minceLight: "#a9634a",
	batter: "#dfa24c",
	batterDark: "#b87326",
	shrimp: "#f08a5d",
	shrimpLight: "#f9c1a0",
	tofuShade: "#eadcb8",
	sausage: "#d4674a",
	sausageDark: "#a8432c",
	skin: "#8c9bab",
} as const;

export type DishColor = keyof typeof dishColors;

type DishGeometry =
	| { kind: "circle"; cx: number; cy: number; r: number }
	| {
			kind: "ellipse";
			cx: number;
			cy: number;
			rx: number;
			ry: number;
			rotate?: number;
	  }
	| {
			kind: "rect";
			x: number;
			y: number;
			width: number;
			height: number;
			radius?: number;
			rotate?: number;
	  }
	| { kind: "path"; d: string }
	// 線（麺やソースなど）。fill が線の色になる。
	| { kind: "stroke"; d: string; width: number };

// "tint" は、利用者が選ぶ色（器など）に置き換わる。
export type DishShape = DishGeometry & {
	fill: DishColor | "tint";
	opacity?: number;
};

export type DishPart = {
	id: string;
	label: string;
	// 色を選べる部品（器）の候補。先頭が既定。
	tints: readonly string[];
	shapes: readonly DishShape[];
};

const bowlTints = ["#d9573f", "#3f6fa3", "#e6dfcb"] as const;

const donburi: DishPart = {
	id: "donburi",
	label: "丼",
	tints: bowlTints,
	shapes: [
		{
			kind: "rect",
			x: 36,
			y: 76,
			width: 28,
			height: 10,
			radius: 3,
			fill: "tint",
		},
		{
			kind: "rect",
			x: 36,
			y: 76,
			width: 28,
			height: 10,
			radius: 3,
			fill: "ink",
			opacity: 0.18,
		},
		{
			kind: "path",
			d: "M8 40 H92 C92 66 74 80 50 80 C26 80 8 66 8 40 Z",
			fill: "tint",
		},
		{
			kind: "path",
			d: "M50 80 C74 80 92 66 92 40 H70 C70 60 62 74 50 80 Z",
			fill: "ink",
			opacity: 0.12,
		},
		{
			kind: "rect",
			x: 6,
			y: 35,
			width: 88,
			height: 9,
			radius: 4.5,
			fill: "tint",
		},
		{
			kind: "rect",
			x: 6,
			y: 35,
			width: 88,
			height: 9,
			radius: 4.5,
			fill: "white",
			opacity: 0.28,
		},
		{
			kind: "ellipse",
			cx: 28,
			cy: 56,
			rx: 7,
			ry: 3,
			rotate: 40,
			fill: "white",
			opacity: 0.3,
		},
	],
};

const rice: DishPart = {
	id: "rice",
	label: "ご飯",
	tints: [],
	shapes: [
		{
			kind: "path",
			d: "M12 76 C12 42 34 22 50 22 C66 22 88 42 88 76 Z",
			fill: "riceShade",
		},
		{
			kind: "path",
			d: "M16 72 C16 42 36 26 50 26 C64 26 78 40 80 66 C70 72 40 76 16 72 Z",
			fill: "white",
		},
		{
			kind: "ellipse",
			cx: 38,
			cy: 44,
			rx: 4,
			ry: 2,
			rotate: -30,
			fill: "riceShade",
		},
		{
			kind: "ellipse",
			cx: 56,
			cy: 36,
			rx: 4,
			ry: 2,
			rotate: 20,
			fill: "riceShade",
		},
		{
			kind: "ellipse",
			cx: 60,
			cy: 54,
			rx: 4,
			ry: 2,
			rotate: -15,
			fill: "riceShade",
		},
		{
			kind: "ellipse",
			cx: 34,
			cy: 60,
			rx: 4,
			ry: 2,
			rotate: 25,
			fill: "riceShade",
		},
		{
			kind: "ellipse",
			cx: 48,
			cy: 64,
			rx: 4,
			ry: 2,
			rotate: -20,
			fill: "riceShade",
		},
	],
};

const misoSoup: DishPart = {
	id: "miso-soup",
	label: "味噌汁",
	tints: bowlTints,
	shapes: [
		{
			kind: "path",
			d: "M14 42 C14 68 28 82 50 82 C72 82 86 68 86 42 Z",
			fill: "tint",
		},
		{
			kind: "path",
			d: "M50 82 C72 82 86 68 86 42 H68 C68 62 62 76 50 82 Z",
			fill: "ink",
			opacity: 0.12,
		},
		{ kind: "ellipse", cx: 50, cy: 42, rx: 37, ry: 13, fill: "tint" },
		{
			kind: "ellipse",
			cx: 50,
			cy: 42,
			rx: 37,
			ry: 13,
			fill: "white",
			opacity: 0.28,
		},
		{ kind: "ellipse", cx: 50, cy: 43, rx: 31, ry: 9.5, fill: "miso" },
		{
			kind: "rect",
			x: 36,
			y: 38,
			width: 10,
			height: 8,
			radius: 2,
			fill: "tofu",
		},
		{
			kind: "rect",
			x: 54,
			y: 41,
			width: 10,
			height: 8,
			radius: 2,
			fill: "tofu",
			rotate: 18,
		},
		{
			kind: "ellipse",
			cx: 48,
			cy: 47,
			rx: 6,
			ry: 2.5,
			rotate: -12,
			fill: "leafDark",
		},
		{ kind: "circle", cx: 66, cy: 38, r: 2.4, fill: "leaf" },
		{ kind: "circle", cx: 71, cy: 43, r: 2.4, fill: "leaf" },
		{ kind: "circle", cx: 30, cy: 42, r: 2.4, fill: "leaf" },
	],
};

const tamagoyaki: DishPart = {
	id: "tamagoyaki",
	label: "卵焼き",
	tints: [],
	shapes: [
		{
			kind: "rect",
			x: 10,
			y: 38,
			width: 24,
			height: 32,
			radius: 7,
			fill: "yolkDark",
		},
		{
			kind: "rect",
			x: 38,
			y: 38,
			width: 24,
			height: 32,
			radius: 7,
			fill: "yolkDark",
		},
		{
			kind: "rect",
			x: 66,
			y: 38,
			width: 24,
			height: 32,
			radius: 7,
			fill: "yolkDark",
		},
		{
			kind: "rect",
			x: 13,
			y: 41,
			width: 18,
			height: 26,
			radius: 5,
			fill: "yolk",
		},
		{
			kind: "rect",
			x: 41,
			y: 41,
			width: 18,
			height: 26,
			radius: 5,
			fill: "yolk",
		},
		{
			kind: "rect",
			x: 69,
			y: 41,
			width: 18,
			height: 26,
			radius: 5,
			fill: "yolk",
		},
		{
			kind: "rect",
			x: 17,
			y: 47,
			width: 10,
			height: 14,
			radius: 3,
			fill: "yolkDark",
			opacity: 0.55,
		},
		{
			kind: "rect",
			x: 45,
			y: 47,
			width: 10,
			height: 14,
			radius: 3,
			fill: "yolkDark",
			opacity: 0.55,
		},
		{
			kind: "rect",
			x: 73,
			y: 47,
			width: 10,
			height: 14,
			radius: 3,
			fill: "yolkDark",
			opacity: 0.55,
		},
	],
};

const grilledFish: DishPart = {
	id: "grilled-fish",
	label: "焼き魚",
	tints: [],
	shapes: [
		{ kind: "path", d: "M70 50 L92 34 C90 44 90 56 92 66 Z", fill: "fishBurn" },
		{ kind: "path", d: "M34 46 L46 24 L66 46 Z", fill: "fishBurn" },
		{
			kind: "path",
			d: "M8 52 C16 36 44 30 72 46 C74 48 74 52 72 54 C44 70 16 68 8 52 Z",
			fill: "fish",
		},
		{
			kind: "path",
			d: "M14 58 C30 68 56 66 72 54 C74 52 74 50 72 48 C52 60 30 62 14 58 Z",
			fill: "fishLight",
		},
		{
			kind: "ellipse",
			cx: 40,
			cy: 42,
			rx: 14,
			ry: 2.4,
			rotate: 12,
			fill: "fishBurn",
			opacity: 0.55,
		},
		{
			kind: "ellipse",
			cx: 52,
			cy: 42,
			rx: 2.5,
			ry: 4,
			rotate: -20,
			fill: "fishBurn",
			opacity: 0.6,
		},
		{
			kind: "ellipse",
			cx: 60,
			cy: 47,
			rx: 2.5,
			ry: 4,
			rotate: -20,
			fill: "fishBurn",
			opacity: 0.6,
		},
		{
			kind: "ellipse",
			cx: 34,
			cy: 52,
			rx: 1.6,
			ry: 9,
			rotate: 8,
			fill: "fishBurn",
			opacity: 0.45,
		},
		{
			kind: "ellipse",
			cx: 42,
			cy: 62,
			rx: 6,
			ry: 3,
			rotate: -15,
			fill: "fishBurn",
			opacity: 0.5,
		},
		{ kind: "circle", cx: 21, cy: 49, r: 3.6, fill: "white" },
		{ kind: "circle", cx: 20.4, cy: 49, r: 1.8, fill: "ink" },
	],
};

const greens: DishPart = {
	id: "greens",
	label: "葉物",
	tints: [],
	shapes: [
		{
			kind: "ellipse",
			cx: 34,
			cy: 58,
			rx: 26,
			ry: 17,
			rotate: -20,
			fill: "leafDark",
		},
		{
			kind: "ellipse",
			cx: 66,
			cy: 56,
			rx: 26,
			ry: 17,
			rotate: 20,
			fill: "leafDark",
		},
		{ kind: "ellipse", cx: 50, cy: 46, rx: 28, ry: 20, fill: "leaf" },
		{ kind: "ellipse", cx: 50, cy: 46, rx: 2, ry: 16, fill: "leafLight" },
		{
			kind: "ellipse",
			cx: 38,
			cy: 48,
			rx: 1.6,
			ry: 10,
			rotate: 50,
			fill: "leafLight",
		},
		{
			kind: "ellipse",
			cx: 62,
			cy: 48,
			rx: 1.6,
			ry: 10,
			rotate: -50,
			fill: "leafLight",
		},
	],
};

const plate: DishPart = {
	id: "plate",
	label: "平皿",
	tints: bowlTints,
	shapes: [
		{ kind: "ellipse", cx: 50, cy: 60, rx: 44, ry: 15, fill: "tint" },
		{
			kind: "ellipse",
			cx: 50,
			cy: 60,
			rx: 44,
			ry: 15,
			fill: "ink",
			opacity: 0.18,
		},
		{ kind: "ellipse", cx: 50, cy: 55, rx: 44, ry: 15, fill: "tint" },
		{
			kind: "ellipse",
			cx: 50,
			cy: 56,
			rx: 33,
			ry: 10.5,
			fill: "white",
			opacity: 0.3,
		},
	],
};

const deepPlate: DishPart = {
	id: "deep-plate",
	label: "深皿",
	tints: bowlTints,
	shapes: [
		{
			kind: "path",
			d: "M8 50 C10 72 30 80 50 80 C70 80 90 72 92 50 Z",
			fill: "tint",
		},
		{
			kind: "path",
			d: "M50 80 C70 80 90 72 92 50 H72 C70 66 62 76 50 80 Z",
			fill: "ink",
			opacity: 0.12,
		},
		{ kind: "ellipse", cx: 50, cy: 50, rx: 44, ry: 18, fill: "tint" },
		{
			kind: "ellipse",
			cx: 50,
			cy: 52,
			rx: 34,
			ry: 12,
			fill: "white",
			opacity: 0.3,
		},
	],
};

const pot: DishPart = {
	id: "pot",
	label: "鍋",
	tints: ["#8a6a4f", "#e6dfcb", "#3a3632"],
	shapes: [
		{ kind: "ellipse", cx: 8, cy: 52, rx: 6, ry: 4.5, fill: "tint" },
		{ kind: "ellipse", cx: 92, cy: 52, rx: 6, ry: 4.5, fill: "tint" },
		{
			kind: "path",
			d: "M10 46 C10 76 28 86 50 86 C72 86 90 76 90 46 Z",
			fill: "tint",
		},
		{
			kind: "path",
			d: "M50 86 C72 86 90 76 90 46 H72 C72 68 64 82 50 86 Z",
			fill: "ink",
			opacity: 0.14,
		},
		{
			kind: "path",
			d: "M16 44 C16 30 32 22 50 22 C68 22 84 30 84 44 Z",
			fill: "tint",
		},
		{
			kind: "path",
			d: "M16 44 C16 30 32 22 50 22 C68 22 84 30 84 44 Z",
			fill: "white",
			opacity: 0.2,
		},
		{
			kind: "rect",
			x: 10,
			y: 42,
			width: 80,
			height: 7,
			radius: 3.5,
			fill: "tint",
		},
		{
			kind: "rect",
			x: 10,
			y: 42,
			width: 80,
			height: 7,
			radius: 3.5,
			fill: "ink",
			opacity: 0.18,
		},
		{ kind: "circle", cx: 50, cy: 19, r: 5, fill: "tint" },
		{ kind: "circle", cx: 50, cy: 19, r: 5, fill: "ink", opacity: 0.18 },
	],
};

const fryingPan: DishPart = {
	id: "frying-pan",
	label: "フライパン",
	tints: [],
	shapes: [
		{
			kind: "rect",
			x: 66,
			y: 46,
			width: 32,
			height: 9,
			radius: 4.5,
			fill: "ink",
		},
		{ kind: "ellipse", cx: 42, cy: 52, rx: 36, ry: 28, fill: "pan" },
		{ kind: "ellipse", cx: 42, cy: 53, rx: 30, ry: 22, fill: "panInner" },
		{
			kind: "ellipse",
			cx: 28,
			cy: 42,
			rx: 9,
			ry: 3,
			rotate: -30,
			fill: "white",
			opacity: 0.18,
		},
	],
};

const mug: DishPart = {
	id: "mug",
	label: "カップ",
	tints: bowlTints,
	shapes: [
		{
			kind: "path",
			d: "M66 40 C90 36 92 72 66 68 L66 61 C80 63 80 47 66 47 Z",
			fill: "tint",
		},
		{
			kind: "rect",
			x: 20,
			y: 30,
			width: 48,
			height: 52,
			radius: 9,
			fill: "tint",
		},
		{
			kind: "rect",
			x: 52,
			y: 30,
			width: 16,
			height: 52,
			radius: 8,
			fill: "ink",
			opacity: 0.12,
		},
		{ kind: "ellipse", cx: 44, cy: 32, rx: 24, ry: 6, fill: "tint" },
		{ kind: "ellipse", cx: 44, cy: 32, rx: 20, ry: 4, fill: "coffee" },
		{
			kind: "rect",
			x: 26,
			y: 42,
			width: 5,
			height: 28,
			radius: 2.5,
			fill: "white",
			opacity: 0.35,
		},
	],
};

const glass: DishPart = {
	id: "glass",
	label: "グラス",
	tints: ["#f0c77a", "#f6f1e6", "#e8a0a0"],
	shapes: [
		{
			kind: "path",
			d: "M29.6 44 H70.4 L68 82 C68 85 64 86 60 86 H40 C36 86 32 85 32 82 Z",
			fill: "tint",
		},
		{
			kind: "path",
			d: "M26 22 H74 L68 82 C68 85 64 86 60 86 H40 C36 86 32 85 32 82 Z",
			fill: "glass",
			opacity: 0.45,
		},
		{
			kind: "ellipse",
			cx: 50,
			cy: 44,
			rx: 20.4,
			ry: 3,
			fill: "white",
			opacity: 0.35,
		},
		{
			kind: "rect",
			x: 33,
			y: 28,
			width: 4.5,
			height: 46,
			radius: 2.2,
			fill: "white",
			opacity: 0.6,
		},
	],
};

const onigiri: DishPart = {
	id: "onigiri",
	label: "おにぎり",
	tints: [],
	shapes: [
		{
			kind: "path",
			d: "M50 18 C56 18 60 22 66 32 L84 68 C88 78 82 84 74 84 H26 C18 84 12 78 16 68 L34 32 C40 22 44 18 50 18 Z",
			fill: "riceShade",
		},
		{
			kind: "path",
			d: "M50 20 C55 20 58 24 63 33 L80 66 C83 74 80 78 72 78 H28 C20 78 17 74 20 66 L37 33 C42 24 45 20 50 20 Z",
			fill: "white",
		},
		{
			kind: "rect",
			x: 29,
			y: 62,
			width: 42,
			height: 22,
			radius: 4,
			fill: "nori",
		},
		{
			kind: "ellipse",
			cx: 46,
			cy: 38,
			rx: 3.6,
			ry: 1.8,
			rotate: -30,
			fill: "riceShade",
		},
		{
			kind: "ellipse",
			cx: 56,
			cy: 48,
			rx: 3.6,
			ry: 1.8,
			rotate: 25,
			fill: "riceShade",
		},
		{
			kind: "ellipse",
			cx: 42,
			cy: 52,
			rx: 3.6,
			ry: 1.8,
			rotate: 10,
			fill: "riceShade",
		},
	],
};

const shokupan: DishPart = {
	id: "shokupan",
	label: "食パン",
	tints: [],
	shapes: [
		{
			kind: "path",
			d: "M20 84 V46 C8 46 6 22 28 20 C40 18 60 18 72 20 C94 22 92 46 80 46 V84 Z",
			fill: "crust",
		},
		{
			kind: "path",
			d: "M26 79 V41 C18 40 17 28 30 26 C41 24 59 24 70 26 C83 28 82 40 74 41 V79 Z",
			fill: "crumb",
		},
		{ kind: "circle", cx: 38, cy: 44, r: 1.6, fill: "crustLight" },
		{ kind: "circle", cx: 56, cy: 38, r: 1.6, fill: "crustLight" },
		{ kind: "circle", cx: 48, cy: 58, r: 1.6, fill: "crustLight" },
		{ kind: "circle", cx: 62, cy: 62, r: 1.6, fill: "crustLight" },
		{ kind: "circle", cx: 36, cy: 68, r: 1.6, fill: "crustLight" },
	],
};

const roll: DishPart = {
	id: "roll",
	label: "パン",
	tints: [],
	shapes: [
		{ kind: "ellipse", cx: 50, cy: 58, rx: 38, ry: 26, fill: "crust" },
		{ kind: "ellipse", cx: 46, cy: 52, rx: 28, ry: 17, fill: "crustLight" },
		{
			kind: "ellipse",
			cx: 36,
			cy: 52,
			rx: 9,
			ry: 2,
			rotate: -25,
			fill: "crumb",
		},
		{
			kind: "ellipse",
			cx: 50,
			cy: 48,
			rx: 9,
			ry: 2,
			rotate: -25,
			fill: "crumb",
		},
		{
			kind: "ellipse",
			cx: 64,
			cy: 52,
			rx: 9,
			ry: 2,
			rotate: -25,
			fill: "crumb",
		},
	],
};

// 麺の一本。下に暗い線を敷いて、重なりが分かるようにする。
function noodleStrand(d: string): readonly DishShape[] {
	return [
		{ kind: "stroke", d, width: 5.8, fill: "ink", opacity: 0.16 },
		{ kind: "stroke", d, width: 4, fill: "tint" },
	];
}

const noodles: DishPart = {
	id: "noodles",
	label: "麺",
	tints: ["#f3d27a", "#fbf6e8", "#f1e0b0"],
	shapes: [
		{ kind: "ellipse", cx: 50, cy: 58, rx: 38, ry: 17, fill: "tint" },
		{
			kind: "ellipse",
			cx: 50,
			cy: 58,
			rx: 38,
			ry: 17,
			fill: "ink",
			opacity: 0.16,
		},
		...noodleStrand("M12 58 C22 44 34 44 44 54 S66 66 88 52"),
		...noodleStrand("M14 66 C26 54 38 56 50 64 S72 70 86 60"),
		...noodleStrand("M16 48 C28 36 44 38 54 46 S72 52 84 44"),
		...noodleStrand("M10 52 C24 62 38 64 52 56 S74 42 90 54"),
		...noodleStrand("M24 42 C36 52 50 50 60 42 S78 38 86 48"),
		...noodleStrand("M12 62 C28 70 44 72 58 66 S80 56 88 64"),
		...noodleStrand("M20 72 C34 62 48 66 60 72 S76 72 82 66"),
	],
};

const steak: DishPart = {
	id: "steak",
	label: "ステーキ",
	tints: [],
	shapes: [
		{
			kind: "path",
			d: "M12 56 C12 36 34 30 56 32 C78 32 90 42 88 58 C86 72 66 78 44 76 C24 74 12 68 12 56 Z",
			fill: "meatDark",
		},
		{
			kind: "path",
			d: "M14 52 C14 36 34 30 56 32 C76 32 88 42 86 54 C84 66 66 72 44 70 C26 68 14 62 14 52 Z",
			fill: "meat",
		},
		{
			kind: "ellipse",
			cx: 50,
			cy: 35,
			rx: 28,
			ry: 3.4,
			rotate: 2,
			fill: "fat",
		},
		{
			kind: "ellipse",
			cx: 36,
			cy: 52,
			rx: 12,
			ry: 2,
			rotate: -35,
			fill: "ink",
			opacity: 0.28,
		},
		{
			kind: "ellipse",
			cx: 54,
			cy: 54,
			rx: 12,
			ry: 2,
			rotate: -35,
			fill: "ink",
			opacity: 0.28,
		},
		{
			kind: "ellipse",
			cx: 70,
			cy: 52,
			rx: 9,
			ry: 2,
			rotate: -35,
			fill: "ink",
			opacity: 0.28,
		},
		{
			kind: "ellipse",
			cx: 30,
			cy: 44,
			rx: 8,
			ry: 3,
			rotate: -20,
			fill: "white",
			opacity: 0.18,
		},
	],
};

const slicedMeat: DishPart = {
	id: "sliced-meat",
	label: "薄切り肉",
	tints: [],
	shapes: [
		{
			kind: "rect",
			x: 12,
			y: 54,
			width: 74,
			height: 20,
			radius: 10,
			fill: "meatPink",
		},
		{
			kind: "rect",
			x: 16,
			y: 40,
			width: 74,
			height: 20,
			radius: 10,
			fill: "meatPink",
			rotate: -3,
		},
		{
			kind: "rect",
			x: 10,
			y: 26,
			width: 74,
			height: 20,
			radius: 10,
			fill: "meatPink",
			rotate: 3,
		},
		{
			kind: "rect",
			x: 14,
			y: 54,
			width: 74,
			height: 20,
			radius: 10,
			fill: "ink",
			opacity: 0.05,
		},
		{ kind: "ellipse", cx: 34, cy: 36, rx: 12, ry: 2, rotate: 8, fill: "fat" },
		{ kind: "ellipse", cx: 62, cy: 38, rx: 10, ry: 2, rotate: -6, fill: "fat" },
		{ kind: "ellipse", cx: 40, cy: 50, rx: 14, ry: 2, rotate: -4, fill: "fat" },
		{ kind: "ellipse", cx: 70, cy: 52, rx: 8, ry: 2, rotate: 4, fill: "fat" },
		{ kind: "ellipse", cx: 34, cy: 64, rx: 12, ry: 2, rotate: 5, fill: "fat" },
		{ kind: "ellipse", cx: 64, cy: 66, rx: 12, ry: 2, rotate: -5, fill: "fat" },
	],
};

const mincedMeat: DishPart = {
	id: "minced-meat",
	label: "ひき肉",
	tints: [],
	shapes: [
		{
			kind: "path",
			d: "M12 74 C14 44 36 30 50 30 C64 30 86 44 88 74 Z",
			fill: "mince",
		},
		{ kind: "circle", cx: 38, cy: 46, r: 4.2, fill: "minceLight" },
		{ kind: "circle", cx: 54, cy: 40, r: 4.2, fill: "minceLight" },
		{ kind: "circle", cx: 66, cy: 52, r: 4.2, fill: "minceLight" },
		{ kind: "circle", cx: 46, cy: 58, r: 4.2, fill: "minceLight" },
		{ kind: "circle", cx: 28, cy: 62, r: 4.2, fill: "minceLight" },
		{ kind: "circle", cx: 74, cy: 66, r: 4.2, fill: "minceLight" },
		{ kind: "circle", cx: 58, cy: 68, r: 4.2, fill: "minceLight" },
		{ kind: "circle", cx: 40, cy: 72, r: 3.6, fill: "meatDark" },
		{ kind: "circle", cx: 62, cy: 56, r: 3.2, fill: "meatDark" },
		{ kind: "circle", cx: 34, cy: 52, r: 3.2, fill: "meatDark" },
	],
};

const karaage: DishPart = {
	id: "karaage",
	label: "唐揚げ",
	tints: [],
	shapes: [
		{ kind: "circle", cx: 50, cy: 38, r: 17, fill: "batterDark" },
		{ kind: "circle", cx: 50, cy: 37, r: 15.5, fill: "batter" },
		{ kind: "circle", cx: 32, cy: 62, r: 18, fill: "batterDark" },
		{ kind: "circle", cx: 32, cy: 61, r: 16.5, fill: "batter" },
		{ kind: "circle", cx: 68, cy: 62, r: 18, fill: "batterDark" },
		{ kind: "circle", cx: 68, cy: 61, r: 16.5, fill: "batter" },
		{
			kind: "ellipse",
			cx: 45,
			cy: 31,
			rx: 5,
			ry: 2.4,
			rotate: -30,
			fill: "white",
			opacity: 0.3,
		},
		{
			kind: "ellipse",
			cx: 27,
			cy: 55,
			rx: 5,
			ry: 2.4,
			rotate: -30,
			fill: "white",
			opacity: 0.3,
		},
		{
			kind: "ellipse",
			cx: 63,
			cy: 55,
			rx: 5,
			ry: 2.4,
			rotate: -30,
			fill: "white",
			opacity: 0.3,
		},
		{ kind: "circle", cx: 54, cy: 42, r: 2, fill: "batterDark", opacity: 0.6 },
		{ kind: "circle", cx: 38, cy: 66, r: 2, fill: "batterDark", opacity: 0.6 },
		{ kind: "circle", cx: 72, cy: 67, r: 2, fill: "batterDark", opacity: 0.6 },
	],
};

const shrimp: DishPart = {
	id: "shrimp",
	label: "えび",
	tints: [],
	shapes: [
		{ kind: "path", d: "M32 68 L14 62 L18 78 Z", fill: "shrimpLight" },
		{
			kind: "path",
			d: "M68 24 C92 30 96 64 66 76 C52 82 38 76 30 64 C44 68 58 64 66 54 C72 44 68 36 58 32 Z",
			fill: "shrimp",
		},
		{
			kind: "path",
			d: "M30 64 C38 76 52 82 66 76 C82 70 90 58 90 48 C84 62 70 70 56 70 C46 70 36 68 30 64 Z",
			fill: "shrimpLight",
		},
		{
			kind: "ellipse",
			cx: 82,
			cy: 44,
			rx: 1.6,
			ry: 7,
			rotate: 30,
			fill: "meatDark",
			opacity: 0.3,
		},
		{
			kind: "ellipse",
			cx: 78,
			cy: 58,
			rx: 1.6,
			ry: 7,
			rotate: 60,
			fill: "meatDark",
			opacity: 0.3,
		},
		{
			kind: "ellipse",
			cx: 66,
			cy: 68,
			rx: 1.6,
			ry: 6,
			rotate: 95,
			fill: "meatDark",
			opacity: 0.3,
		},
		{ kind: "circle", cx: 62, cy: 32, r: 2.4, fill: "ink" },
	],
};

const friedEgg: DishPart = {
	id: "fried-egg",
	label: "目玉焼き",
	tints: [],
	shapes: [
		{
			kind: "path",
			d: "M14 56 C10 40 28 28 44 32 C58 24 82 30 86 48 C92 64 76 80 58 76 C44 84 20 78 14 56 Z",
			fill: "riceShade",
		},
		{
			kind: "path",
			d: "M14 52 C10 36 28 24 44 28 C58 20 82 26 86 44 C92 60 76 76 58 72 C44 80 20 74 14 52 Z",
			fill: "white",
		},
		{ kind: "circle", cx: 46, cy: 50, r: 16, fill: "yolkDark" },
		{ kind: "circle", cx: 46, cy: 49, r: 14.5, fill: "yolk" },
		{
			kind: "ellipse",
			cx: 40,
			cy: 43,
			rx: 5,
			ry: 2.6,
			rotate: -35,
			fill: "white",
			opacity: 0.5,
		},
	],
};

const boiledEgg: DishPart = {
	id: "boiled-egg",
	label: "ゆで卵",
	tints: [],
	shapes: [
		{ kind: "ellipse", cx: 50, cy: 52, rx: 26, ry: 32, fill: "riceShade" },
		{ kind: "ellipse", cx: 50, cy: 51, rx: 24, ry: 30, fill: "white" },
		{ kind: "ellipse", cx: 50, cy: 54, rx: 13, ry: 16, fill: "yolkDark" },
		{ kind: "ellipse", cx: 50, cy: 53, rx: 11.5, ry: 14.5, fill: "yolk" },
		{
			kind: "ellipse",
			cx: 45,
			cy: 47,
			rx: 4,
			ry: 2.4,
			rotate: -35,
			fill: "white",
			opacity: 0.45,
		},
	],
};

const tofu: DishPart = {
	id: "tofu",
	label: "豆腐",
	tints: [],
	shapes: [
		{ kind: "path", d: "M20 44 L34 30 H84 L70 44 Z", fill: "white" },
		{ kind: "path", d: "M70 44 L84 30 V64 L70 78 Z", fill: "tofuShade" },
		{
			kind: "rect",
			x: 20,
			y: 44,
			width: 50,
			height: 34,
			radius: 3,
			fill: "tofu",
		},
		{
			kind: "rect",
			x: 26,
			y: 50,
			width: 12,
			height: 3,
			radius: 1.5,
			fill: "tofuShade",
		},
	],
};

const fishFillet: DishPart = {
	id: "fish-fillet",
	label: "切り身",
	tints: [],
	shapes: [
		{
			kind: "path",
			d: "M10 44 C10 32 30 30 50 32 C70 34 90 34 90 46 C90 64 78 72 56 72 C34 72 10 68 10 44 Z",
			fill: "fishBurn",
		},
		{
			kind: "path",
			d: "M12 44 C12 34 30 32 50 34 C70 36 88 36 88 46 C88 58 78 64 56 64 C34 64 12 62 12 44 Z",
			fill: "fish",
		},
		{
			kind: "path",
			d: "M13 55 C20 66 38 72 56 72 C78 72 90 64 90 50 C84 60 70 66 56 66 C38 66 22 62 13 55 Z",
			fill: "skin",
		},
		{
			kind: "ellipse",
			cx: 30,
			cy: 48,
			rx: 2,
			ry: 10,
			rotate: 25,
			fill: "fishLight",
		},
		{
			kind: "ellipse",
			cx: 44,
			cy: 48,
			rx: 2,
			ry: 11,
			rotate: 25,
			fill: "fishLight",
		},
		{
			kind: "ellipse",
			cx: 58,
			cy: 48,
			rx: 2,
			ry: 11,
			rotate: 25,
			fill: "fishLight",
		},
		{
			kind: "ellipse",
			cx: 72,
			cy: 48,
			rx: 2,
			ry: 9,
			rotate: 25,
			fill: "fishLight",
		},
	],
};

const sausage: DishPart = {
	id: "sausage",
	label: "ウインナー",
	tints: [],
	shapes: [
		{
			kind: "rect",
			x: 10,
			y: 38,
			width: 80,
			height: 26,
			radius: 13,
			fill: "sausageDark",
		},
		{
			kind: "rect",
			x: 10,
			y: 36,
			width: 80,
			height: 24,
			radius: 12,
			fill: "sausage",
		},
		{
			kind: "rect",
			x: 20,
			y: 40,
			width: 58,
			height: 4,
			radius: 2,
			fill: "white",
			opacity: 0.3,
		},
		{
			kind: "ellipse",
			cx: 34,
			cy: 50,
			rx: 1.8,
			ry: 8,
			rotate: 25,
			fill: "sausageDark",
			opacity: 0.55,
		},
		{
			kind: "ellipse",
			cx: 50,
			cy: 50,
			rx: 1.8,
			ry: 8,
			rotate: 25,
			fill: "sausageDark",
			opacity: 0.55,
		},
		{
			kind: "ellipse",
			cx: 66,
			cy: 50,
			rx: 1.8,
			ry: 8,
			rotate: 25,
			fill: "sausageDark",
			opacity: 0.55,
		},
	],
};

export const dishParts: readonly DishPart[] = [
	donburi,
	rice,
	misoSoup,
	tamagoyaki,
	grilledFish,
	greens,
	plate,
	deepPlate,
	pot,
	fryingPan,
	mug,
	glass,
	onigiri,
	shokupan,
	roll,
	noodles,
	steak,
	slicedMeat,
	mincedMeat,
	karaage,
	shrimp,
	friedEgg,
	boiledEgg,
	tofu,
	fishFillet,
	sausage,
];

export function findDishPart(id: string): DishPart | undefined {
	return dishParts.find((part) => part.id === id);
}
