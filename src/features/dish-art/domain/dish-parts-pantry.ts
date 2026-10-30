import type { DishPart } from "./dish-part";
import {
	circle,
	ellipse,
	part,
	path,
	rect,
	scatter,
	shade,
	shine,
	stroke,
} from "./dish-part-shapes";

// 調味料・粉・缶・びん・袋など、容器に入った食材の部品。色の選択肢で、中身の違いを描き分ける。

const bottle = part(
	"bottle",
	"びん",
	[
		path(
			"M36 40 L36 82 C36 86 38 89 42 89 L58 89 C62 89 64 86 64 82 L64 40 C64 34 58 32 58 26 L58 16 L42 16 L42 26 C42 32 36 34 36 40 Z",
			"tint",
		),
		shade(
			"M52 16 H58 V26 C58 32 64 34 64 40 V82 C64 86 62 89 58 89 H52 Z",
			0.14,
		),
		rect(36, 52, 28, 22, 2, "white"),
		rect(36, 58, 28, 6, 0, "tomato"),
		rect(40, 10, 20, 9, 2.5, "bottleCap"),
		shine(41, 46, 2.2, 7, 4, 0.5),
	],
	["#3a2418", "#e8c97a", "#e6f1f4", "#6a1f2f", "#e0b030"],
);

const squeezeBottle = part(
	"squeeze-bottle",
	"ボトル（チューブ入り）",
	[
		path(
			"M28 46 C28 34 40 32 40 24 L40 18 L60 18 L60 24 C60 32 72 34 72 46 L72 80 C72 87 67 91 60 91 L40 91 C33 91 28 87 28 80 Z",
			"tint",
		),
		shade(
			"M54 18 H60 V24 C60 32 72 34 72 46 V80 C72 87 67 91 60 91 H54 Z",
			0.14,
		),
		ellipse(50, 62, 16, 14, "white"),
		circle(50, 62, 6, "tomato"),
		path("M42 18 L44 8 H56 L58 18 Z", "squeezeCap"),
		rect(47, 4, 6, 6, 2, "squeezeCap"),
		shine(34, 48, 2.6, 8, 4, 0.5),
	],
	["#fff2cf", "#e0452f", "#f0c030", "#5b3524"],
);

const tube = part(
	"tube",
	"チューブ",
	[
		rect(14, 44, 64, 20, 7, "tint", { rotate: -14 }),
		shade("M18 62 L82 46 L80 54 L20 70 Z", 0.12),
		rect(74, 36, 12, 18, 3, "white", { rotate: -14 }),
		rect(6, 46, 9, 26, 2, "tint", { rotate: -14 }),
		stroke("M7 50 L14 72", 1.5, "ink", 0.2),
		rect(30, 50, 22, 10, 2, "white", { rotate: -14, opacity: 0.85 }),
		shine(52, 46, 8, 2, -14, 0.4),
	],
	["#58ad6e", "#f4b81c", "#f6efe0", "#e8c58a"],
);

const misoTub = part(
	"miso-tub",
	"味噌",
	[
		ellipse(50, 42, 36, 10, "white"),
		path(
			"M14 42 H86 L80 84 C80 88 78 90 74 90 H26 C22 90 20 88 20 84 Z",
			"white",
		),
		shade("M62 52 H86 L80 84 C80 88 78 90 74 90 H62 Z", 0.1),
		rect(16, 62, 68, 10, 0, "tomato"),
		ellipse(50, 42, 32, 8, "tint"),
		stroke("M28 42 C40 38 58 46 72 40", 2, "ink", 0.18),
		shine(38, 41, 8, 1.8, -8, 0.4),
	],
	["#c98a4b", "#e8c58a", "#8a4a2c"],
);

const jar = part(
	"jar",
	"びん詰め",
	[
		rect(22, 34, 56, 54, 9, "glass"),
		rect(26, 44, 48, 40, 6, "tint"),
		shade("M62 34 H70 C74 34 78 38 78 42 V80 C78 85 74 88 70 88 H62 Z", 0.1),
		rect(22, 18, 56, 18, 4, "jarLid"),
		stroke("M28 24 V32", 1.6, "ink", 0.2),
		stroke("M40 24 V32", 1.6, "ink", 0.2),
		stroke("M52 24 V32", 1.6, "ink", 0.2),
		stroke("M64 24 V32", 1.6, "ink", 0.2),
		rect(32, 54, 36, 18, 3, "white"),
		shine(30, 52, 2.4, 10, 4, 0.5),
	],
	["#c8283a", "#d9402f", "#e8b84a", "#6a3f2a"],
);

const salt = part(
	"salt",
	"塩・こしょう",
	[
		path(
			"M32 38 H68 L72 84 C72 87 70 89 67 89 H33 C30 89 28 87 28 84 Z",
			"glass",
		),
		path(
			"M31 54 H69 L72 84 C72 87 70 89 67 89 H33 C30 89 28 87 28 84 Z",
			"salt",
		),
		path("M32 38 C32 22 68 22 68 38 Z", "tint"),
		...scatter(
			[
				[44, 30],
				[50, 27],
				[56, 30],
			],
			(x, y) => circle(x, y, 1.6, "ink", 0.35),
		),
		shine(35, 66, 2.2, 9, 4, 0.45),
	],
	["#aab0b8", "#d9402f", "#3f6fa3"],
);

const pepperGrinder = part("pepper-grinder", "ミル", [
	path(
		"M38 30 C38 18 62 18 62 30 L67 82 C67 87 63 90 60 90 H40 C37 90 33 87 33 82 Z",
		"wood",
	),
	shade("M52 20 C60 22 62 26 62 30 L67 82 C67 87 63 90 60 90 H52 Z", 0.14),
	rect(34, 54, 32, 5, 0, "metalLight"),
	rect(33, 84, 34, 7, 2, "metalDark"),
	circle(50, 14, 7, "woodDark"),
	rect(46, 16, 8, 6, 1, "woodDark"),
	shine(40, 44, 2, 7, 6, 0.3),
]);

const bag = part(
	"bag",
	"粉・砂糖の袋",
	[
		path("M24 30 L28 22 H72 L76 30 Z", "doughShade"),
		rect(24, 28, 52, 62, 4, "white"),
		rect(62, 28, 14, 62, 2, "ink", { opacity: 0.08 }),
		rect(24, 50, 52, 22, 0, "tint"),
		...scatter(
			[
				[40, 61],
				[50, 61],
				[60, 61],
			],
			(x, y) => circle(x, y, 3.4, "white", 0.85),
		),
		stroke("M28 25 H72", 1.5, "ink", 0.2),
	],
	["#3f6fa3", "#d9402f", "#f4b81c", "#58ad6e"],
);

const breadcrumbs = part("breadcrumbs", "パン粉", [
	ellipse(50, 78, 38, 8, "crumbShade"),
	...scatter(
		[
			[22, 70],
			[34, 74],
			[46, 72],
			[58, 74],
			[70, 72],
			[80, 68],
			[28, 62],
			[40, 64],
			[52, 62],
			[64, 64],
			[74, 60],
			[34, 54],
			[46, 54],
			[58, 54],
			[40, 46],
			[52, 44],
			[48, 36],
		],
		(x, y) => [
			circle(x, y, 4.6, "crumbDark"),
			circle(x - 0.6, y - 0.6, 3.8, "crumb"),
		],
	).flat(),
]);

const pancakeMix = part(
	"pancake-mix",
	"ミックス粉の箱",
	[
		rect(22, 18, 56, 72, 3, "tint"),
		rect(62, 18, 16, 72, 3, "ink", { opacity: 0.1 }),
		rect(22, 18, 56, 8, 0, "white", { opacity: 0.35 }),
		ellipse(46, 56, 20, 5.5, "batterDark"),
		ellipse(46, 52, 20, 5.5, "batter"),
		ellipse(46, 47, 20, 5.5, "batterLight"),
		rect(42, 38, 8, 6, 1.5, "butter"),
		stroke("M34 66 H58", 2, "white", 0.8),
	],
	["#f4b81c", "#d9402f", "#3f6fa3"],
);

const stockCubes = part("stock-cubes", "固形・顆粒だし", [
	path("M16 56 L28 46 L58 46 L46 56 Z", "stockLight"),
	rect(16, 56, 30, 28, 3, "stock"),
	path("M46 56 L58 46 L58 74 L46 84 Z", "stockDark"),
	rect(16, 66, 30, 8, 0, "tomato"),
	path("M44 36 L56 26 L84 26 L72 36 Z", "stockLight"),
	rect(44, 36, 28, 26, 3, "stock"),
	path("M72 36 L84 26 L84 52 L72 62 Z", "stockDark"),
	rect(44, 46, 28, 7, 0, "tomato"),
]);

const roux = part(
	"roux",
	"ルー",
	[
		rect(16, 16, 68, 50, 3, "tint"),
		rect(70, 16, 14, 50, 3, "ink", { opacity: 0.1 }),
		ellipse(42, 36, 14, 10, "curryDark"),
		ellipse(42, 33, 13, 8, "curry"),
		...scatter(
			[
				[18, 0],
				[34, 0],
				[50, 0],
				[66, 0],
			],
			(x) => [
				rect(x, 62, 15, 26, 3, "rouxBlock"),
				rect(x, 62, 15, 5, 2, "rouxBlockLight"),
				stroke(`M${x + 7.5} 68 V86`, 1.2, "rouxBlockDark", 0.6),
			],
		).flat(),
	],
	["#d9402f", "#f4b81c", "#5a3a22"],
);

const waterBottle = part(
	"water-bottle",
	"ペットボトル",
	[
		path(
			"M36 42 C36 34 43 32 43 24 L43 16 L57 16 L57 24 C57 32 64 34 64 42 L64 84 C64 88 61 91 57 91 L43 91 C39 91 36 88 36 84 Z",
			"glass",
		),
		path("M36 52 H64 V84 C64 88 61 91 57 91 H43 C39 91 36 88 36 84 Z", "water"),
		rect(36, 58, 28, 14, 0, "tint"),
		shade(
			"M54 16 H57 V24 C57 32 64 34 64 42 V84 C64 88 61 91 57 91 H54 Z",
			0.1,
		),
		rect(42, 8, 16, 9, 2.5, "tint"),
		stroke("M40 38 H60", 1.2, "white", 0.7),
		shine(40, 60, 1.8, 10, 4, 0.5),
	],
	["#3f6fa3", "#58ad6e", "#d9402f"],
);

// 缶：ふちと底は銀色、まきは色を選べる。
function cannedFood(
	id: string,
	label: string,
	icon: "fish" | "tomato",
): DishPart {
	return part(
		id,
		label,
		[
			rect(24, 32, 52, 50, 6, "metal"),
			rect(24, 40, 52, 34, 0, "tint"),
			shade("M62 40 H76 V74 H62 Z", 0.1),
			ellipse(50, 82, 26, 6, "metalDark"),
			ellipse(50, 32, 26, 8, "metalLight"),
			ellipse(50, 32, 20, 5.5, "metalDark"),
			stroke("M42 31 C42 24 58 24 58 31", 2.2, "metalLight"),
			...(icon === "fish"
				? [
						ellipse(46, 58, 9, 5, "white"),
						path("M54 58 L62 51 L62 65 Z", "white"),
						circle(41, 57, 1, "ink"),
					]
				: [
						circle(50, 59, 9, "tomato"),
						ellipse(50, 50.5, 5, 1.8, "leafDark"),
						shine(46, 55, 3, 1.4, -30, 0.5),
					]),
		],
		["#3f6fa3", "#d9402f", "#f4b81c", "#58ad6e"],
	);
}

const can = cannedFood("can", "缶詰", "fish");
const tomatoCan = cannedFood("tomato-can", "トマト缶", "tomato");

export const pantryParts: readonly DishPart[] = [
	bottle,
	squeezeBottle,
	tube,
	misoTub,
	jar,
	salt,
	pepperGrinder,
	bag,
	breadcrumbs,
	pancakeMix,
	stockCubes,
	roux,
	waterBottle,
	can,
	tomatoCan,
];
