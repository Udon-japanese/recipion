import type { DishPart } from "./dish-part";
import {
	arc,
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

// 肉・魚・卵・大豆加工品・乳製品・麺・乾物の部品。

const chickenBreast = part("chicken-breast", "鶏むね肉", [
	path(
		"M12 58 C14 36 44 22 70 30 C90 36 92 58 74 72 C56 86 20 82 12 58 Z",
		"chickenBreast",
	),
	shade(
		"M12 58 C20 82 56 86 74 72 C92 58 90 40 80 34 C80 54 60 70 12 58 Z",
		0.1,
	),
	stroke("M26 52 C40 44 56 40 70 42", 1.6, "chickenBreastDark", 0.7),
	stroke("M24 62 C40 58 58 54 76 56", 1.6, "chickenBreastDark", 0.7),
	path(
		"M12 58 C14 50 18 44 24 40 C22 52 20 60 24 68 C16 66 12 62 12 58 Z",
		"fat",
		0.9,
	),
	shine(46, 42, 9, 3, -12, 0.35),
]);

const wing = part("wing", "手羽先", [
	path(
		"M16 72 C8 56 22 38 40 40 C52 28 76 28 86 40 C92 48 84 62 70 64 C60 70 50 72 40 76 C32 84 22 82 16 72 Z",
		"wing",
	),
	shade(
		"M16 72 C22 82 32 84 40 76 C50 72 60 70 70 64 C84 62 92 48 86 40 C84 56 60 68 16 72 Z",
		0.1,
	),
	...scatter(
		[
			[40, 52],
			[52, 46],
			[64, 44],
			[58, 58],
			[72, 52],
			[32, 62],
		],
		(x, y) => circle(x, y, 1.4, "wingDark"),
	),
	circle(14, 72, 6, "bone"),
	circle(10, 66, 4.5, "bone"),
	shine(50, 40, 8, 2.6, -8, 0.35),
]);

const porkBelly = part("pork-belly", "豚バラ肉", [
	rect(12, 32, 76, 38, 9, "meatPink"),
	stroke("M14 42 C34 36 56 48 86 40", 6, "fat"),
	stroke("M14 54 C34 48 56 60 86 52", 6, "fat"),
	stroke("M14 64 C34 60 56 68 86 62", 5, "fat"),
	shade("M12 62 H88 V64 C88 68 84 70 80 70 H20 C16 70 12 68 12 64 Z", 0.12),
	shine(30, 38, 8, 2.4, -10, 0.35),
]);

const bacon = part("bacon", "ベーコン", [
	...[0, 28].flatMap((dy) => [
		path(
			`M8 ${22 + dy} C22 ${14 + dy} 30 ${30 + dy} 44 ${22 + dy} C58 ${14 + dy} 66 ${30 + dy} 92 ${22 + dy} L92 ${40 + dy} C66 ${48 + dy} 58 ${32 + dy} 44 ${40 + dy} C30 ${48 + dy} 22 ${32 + dy} 8 ${40 + dy} Z`,
			"bacon",
		),
		stroke(
			`M8 ${31 + dy} C22 ${23 + dy} 30 ${39 + dy} 44 ${31 + dy} C58 ${23 + dy} 66 ${39 + dy} 92 ${31 + dy}`,
			5,
			"baconFat",
		),
	]),
]);

const ham = part("ham", "ハム", [
	rect(16, 54, 66, 26, 11, "hamDark"),
	rect(18, 44, 66, 26, 11, "ham"),
	rect(20, 32, 66, 26, 11, "hamLight"),
	...scatter(
		[
			[34, 42],
			[52, 38],
			[68, 44],
			[44, 48],
		],
		(x, y) => circle(x, y, 1.6, "ham"),
	),
	shine(36, 36, 9, 2.4, -6, 0.5),
]);

const mentaiko = part("mentaiko", "たらこ", [
	ellipse(50, 38, 36, 12, "mentaikoDark", { rotate: -8 }),
	ellipse(50, 36, 35, 11, "mentaiko", { rotate: -8 }),
	ellipse(48, 64, 36, 12, "mentaikoDark", { rotate: 6 }),
	ellipse(48, 62, 35, 11, "mentaiko", { rotate: 6 }),
	stroke("M18 40 C40 32 64 34 82 30", 1.5, "mentaikoDark", 0.6),
	stroke("M16 66 C40 60 64 62 82 66", 1.5, "mentaikoDark", 0.6),
	shine(36, 32, 10, 2.4, -8, 0.45),
	shine(34, 58, 10, 2.4, 4, 0.45),
]);

const clam = part("clam", "あさり", [
	ellipse(36, 62, 24, 20, "clamDark", { rotate: -10 }),
	ellipse(36, 60, 23, 19, "clam", { rotate: -10 }),
	stroke("M36 78 L22 46", 1.6, "clamDark"),
	stroke("M36 78 L36 42", 1.6, "clamDark"),
	stroke("M36 78 L50 46", 1.6, "clamDark"),
	ellipse(66, 54, 24, 20, "clamDark", { rotate: 12 }),
	ellipse(66, 52, 23, 19, "clamLight", { rotate: 12 }),
	stroke("M66 70 L52 40", 1.6, "clamDark"),
	stroke("M66 70 L66 36", 1.6, "clamDark"),
	stroke("M66 70 L80 40", 1.6, "clamDark"),
]);

const wholeFish = part("whole-fish", "魚", [
	path(
		"M10 50 C24 26 58 22 76 40 L94 26 L90 74 L76 60 C58 78 24 74 10 50 Z",
		"fishBody",
	),
	path("M14 52 C30 62 58 66 74 56 C60 72 28 70 14 52 Z", "fishBelly"),
	stroke("M26 36 C34 40 40 40 46 38", 2, "fishBodyDark"),
	stroke("M40 32 C48 38 54 38 62 36", 2, "fishBodyDark"),
	stroke("M54 30 C60 34 66 34 72 34", 2, "fishBodyDark"),
	path("M44 36 L50 20 L60 34 Z", "fishBodyDark"),
	stroke("M32 40 C28 48 28 54 32 60", 1.8, "fishBodyDark"),
	circle(22, 48, 3.6, "white"),
	circle(22, 48, 1.8, "ink"),
]);

const shirasu = part("shirasu", "しらす", [
	ellipse(50, 78, 38, 8, "shirasuShade"),
	...scatter(
		[
			[22, 70, -10],
			[38, 72, 6],
			[54, 72, -4],
			[70, 70, 12],
			[30, 60, 18],
			[46, 62, -14],
			[62, 60, 8],
			[78, 62, -8],
			[36, 50, -6],
			[52, 52, 14],
			[68, 50, -12],
			[44, 40, 8],
			[60, 40, -6],
			[52, 30, 4],
		],
		(x, y, turn) => [
			ellipse(x, y, 9, 2.6, "shirasu", { rotate: turn }),
			circle(x - 5, y - 0.4, 0.9, "ink"),
		],
	).flat(),
]);

const quailEgg = part("quail-egg", "うずらの卵", [
	...scatter(
		[
			[32, 62, -12],
			[66, 62, 14],
			[48, 34, 0],
		],
		(x, y, turn) => [
			ellipse(x, y, 14, 18, "quailEgg", { rotate: turn }),
			...scatter(
				[
					[-5, -6],
					[4, -2],
					[-2, 6],
					[6, 9],
					[-7, 2],
					[2, -10],
				],
				(dx, dy) => circle(x + dx, y + dy, 1.7, "quailSpot"),
			),
		],
	).flat(),
]);

const onsenEgg = part("onsen-egg", "温泉卵", [
	path("M18 50 H82 C82 74 68 88 50 88 C32 88 18 74 18 50 Z", "bowlWhite"),
	shade("M50 88 C68 88 82 74 82 50 H64 C64 70 58 82 50 88 Z", 0.1),
	ellipse(50, 50, 32, 11, "bowlWhiteDark"),
	ellipse(50, 48, 28, 9, "eggWhite"),
	circle(50, 46, 10, "yolk"),
	shine(46, 42, 4, 2, -30, 0.5),
	stroke("M24 46 C36 40 64 40 76 46", 1.4, "eggWhiteDark", 0.8),
]);

const atsuage = part("atsuage", "厚揚げ", [
	path("M18 34 L36 22 L90 22 L72 34 Z", "tofu"),
	rect(18, 34, 54, 40, 6, "atsuage"),
	path("M72 34 L90 22 L90 60 L72 74 Z", "atsuageDark"),
	stroke("M24 46 C34 42 48 44 66 40", 1.6, "atsuageDark", 0.5),
	stroke("M24 58 C36 54 50 56 66 52", 1.6, "atsuageDark", 0.5),
	shine(32, 42, 7, 2, -10, 0.3),
]);

const aburaage = part("aburaage", "油揚げ", [
	rect(18, 40, 70, 40, 6, "aburaageDark", { rotate: 8 }),
	rect(12, 28, 70, 42, 6, "aburaage", { rotate: -6 }),
	...scatter(
		[
			[28, 44],
			[44, 38],
			[60, 46],
			[36, 56],
			[54, 58],
			[70, 50],
		],
		(x, y) => ellipse(x, y, 5, 2.4, "aburaageDark", { opacity: 0.45 }),
	),
	path("M72 28 L84 36 L74 44 Z", "atsuage"),
]);

const kamaboko = part("kamaboko", "かまぼこ", [
	rect(8, 66, 84, 12, 3, "wood"),
	rect(8, 74, 84, 4, 2, "woodDark"),
	path("M14 66 C14 32 86 32 86 66 Z", "kamabokoPink"),
	path("M20 66 C20 40 80 40 80 66 Z", "kamaboko"),
	shine(38, 50, 9, 2.6, -14, 0.5),
]);

const shirataki = part("shirataki", "しらたき", [
	...scatter(
		[
			[0, 0, 0],
			[3, 5, 0],
			[-3, 10, 0],
			[2, 15, 0],
			[-2, 20, 0],
			[3, 25, 0],
		],
		(dx, dy) => [
			stroke(
				`M${14 + dx} ${28 + dy} C30 ${10 + dy} 44 ${50 + dy} 58 ${34 + dy} C70 ${22 + dy} 80 ${46 + dy} ${88 + dx} ${36 + dy}`,
				4,
				"shirataki",
			),
		],
	).flat(),
	stroke(
		"M18 44 C34 28 46 64 60 48 C72 36 82 58 86 50",
		1.4,
		"shiratakiDark",
		0.6,
	),
]);

const milkCarton = part(
	"milk-carton",
	"牛乳パック",
	[
		path("M28 38 L38 16 L62 16 L72 38 Z", "milkCartonTop"),
		rect(38, 11, 24, 6, 2, "milkCartonTop"),
		rect(28, 38, 44, 50, 2, "white"),
		rect(60, 38, 12, 50, 2, "ink", { opacity: 0.08 }),
		rect(28, 54, 44, 14, 0, "tint"),
		path("M50 56 C46 61 46 65 50 66 C54 65 54 61 50 56 Z", "white"),
		path("M38 16 L62 16 L72 38 L60 38 Z", "ink", 0.08),
	],
	["#4a86c5", "#e0452f", "#58ad6e", "#f4b81c"],
);

const yogurt = part(
	"yogurt",
	"ヨーグルト",
	[
		path(
			"M24 38 L76 38 L70 86 C70 88 68 90 66 90 L34 90 C32 90 30 88 30 86 Z",
			"white",
		),
		shade("M62 38 L76 38 L70 86 C70 88 68 90 66 90 L58 90 Z", 0.08),
		path("M27 56 H73 L71 74 H29 Z", "tint"),
		ellipse(50, 38, 27, 6.5, "metalLight"),
		ellipse(50, 38, 22, 4.5, "metal"),
		path("M70 34 C76 30 82 32 80 36 C76 36 72 38 70 38 Z", "metalLight"),
	],
	["#e0452f", "#f4b81c", "#58ad6e", "#8a5fb0"],
);

const butter = part("butter", "バター", [
	path("M12 48 L28 32 L90 32 L74 48 Z", "butterLight"),
	rect(12, 48, 62, 34, 4, "butter"),
	path("M74 48 L90 32 L90 66 L74 82 Z", "butterDark"),
	path("M12 48 H44 V82 H12 Z", "metalLight"),
	stroke("M18 54 L38 54", 1.5, "metal"),
	stroke("M18 62 L38 62", 1.5, "metal"),
	stroke("M44 48 L44 82", 2, "metalDark", 0.5),
	path("M44 48 L60 34 L56 34 L44 44 Z", "metalLight"),
]);

// 乾麺の束。細さと色と帯の色で、スパゲティ・そうめん・そばに使い分ける。
function dryNoodleBundle(
	id: string,
	label: string,
	color: "pasta" | "somen" | "soba",
	bandColor: "tomato" | "noodleBlue" | "leaf",
	lines: number,
	lineWidth: number,
): DishPart {
	const spread = 16;

	return part(id, label, [
		...Array.from({ length: lines }, (_, i) => {
			const offset = (i / (lines - 1) - 0.5) * 2 * spread;

			return stroke(
				`M${50 + offset * 0.45} 88 L${50 + offset} 12`,
				lineWidth,
				color,
			);
		}),
		rect(34, 46, 32, 16, 2, bandColor),
		rect(40, 50, 20, 8, 1.5, "white", { opacity: 0.85 }),
	]);
}

const pasta = dryNoodleBundle("pasta", "スパゲティ", "pasta", "tomato", 9, 3.4);
const somen = dryNoodleBundle(
	"somen",
	"そうめん",
	"somen",
	"noodleBlue",
	13,
	2.4,
);
const soba = dryNoodleBundle("soba", "そば", "soba", "leaf", 11, 2.8);

const ramen = part("ramen", "中華麺", [
	ellipse(50, 56, 38, 30, "ramenDark"),
	...[0, 6, 12, 18].map((dy) =>
		stroke(
			`M16 ${40 + dy} C26 ${24 + dy} 38 ${58 + dy} 48 ${42 + dy} C58 ${28 + dy} 68 ${60 + dy} 84 ${42 + dy}`,
			4.6,
			"ramen",
		),
	),
	stroke("M22 50 C32 38 42 64 52 50 C62 38 72 62 80 52", 1.4, "ramenDark", 0.6),
]);

const macaroni = part("macaroni", "マカロニ", [
	...scatter(
		[
			[30, 34, 20],
			[68, 32, 200],
			[48, 56, 90],
			[24, 70, 290],
			[72, 68, 140],
		],
		(x, y, turn) => [
			stroke(arc(x, y, 11, turn, turn + 210), 10, "macaroniDark"),
			stroke(arc(x, y, 11, turn, turn + 210), 8, "macaroni"),
			stroke(arc(x, y, 11, turn + 20, turn + 180), 1.6, "macaroniDark", 0.7),
		],
	).flat(),
]);

const mochi = part("mochi", "もち", [
	rect(16, 52, 44, 28, 6, "mochiDark", { rotate: -4 }),
	rect(14, 50, 44, 28, 6, "mochi", { rotate: -4 }),
	rect(44, 36, 44, 28, 6, "mochiDark", { rotate: 6 }),
	rect(42, 34, 44, 28, 6, "mochi", { rotate: 6 }),
	...scatter(
		[
			[58, 40],
			[70, 46],
			[62, 52],
		],
		(x, y) => ellipse(x, y, 6, 3, "mochiToast", { opacity: 0.6 }),
	),
	shine(26, 58, 8, 2.4, -10, 0.5),
]);

const riceBag = part(
	"rice-bag",
	"米袋",
	[
		rect(24, 24, 52, 66, 4, "white"),
		rect(24, 20, 52, 10, 2, "doughShade"),
		stroke("M28 25 H72", 1.5, "ink", 0.2),
		rect(24, 48, 52, 20, 0, "tint"),
		...scatter(
			[
				[40, 58],
				[50, 58],
				[60, 58],
			],
			(x, y) => ellipse(x, y, 2.6, 5.6, "white"),
		),
		rect(62, 24, 14, 66, 2, "ink", { opacity: 0.08 }),
	],
	["#d9402f", "#3f6fa3", "#58ad6e"],
);

const katsuobushi = part("katsuobushi", "かつお節", [
	ellipse(50, 78, 38, 8, "bonitoShade"),
	...scatter(
		[
			[28, 66, -20],
			[46, 68, 10],
			[64, 66, -6],
			[76, 64, 24],
			[34, 56, 18],
			[52, 58, -14],
			[68, 54, 8],
			[42, 46, -8],
			[58, 44, 20],
			[50, 34, -4],
		],
		(x, y, turn) => [
			ellipse(x, y, 11, 6, "bonito", { rotate: turn }),
			ellipse(x + 2, y + 1, 7, 3, "bonitoDark", {
				rotate: turn,
				opacity: 0.55,
			}),
		],
	).flat(),
]);

const wakame = part("wakame", "わかめ", [
	path(
		"M16 70 C14 50 30 38 40 22 C44 38 54 44 52 60 C50 74 30 82 16 70 Z",
		"wakame",
	),
	path(
		"M44 76 C42 56 58 44 70 26 C76 44 84 52 82 66 C80 82 58 90 44 76 Z",
		"wakameDark",
	),
	stroke("M28 68 C32 52 38 38 40 26", 1.6, "wakameDark"),
	stroke("M60 72 C62 56 68 42 70 32", 1.6, "wakame"),
	shine(30, 56, 4, 8, 12, 0.25),
]);

const kombu = part("kombu", "昆布", [
	rect(8, 40, 84, 22, 3, "kombu", { rotate: -9 }),
	rect(10, 62, 80, 20, 3, "kombuDark", { rotate: 6 }),
	...scatter(
		[
			[24, 52],
			[40, 46],
			[58, 44],
			[76, 38],
			[30, 74],
			[52, 72],
			[72, 76],
		],
		(x, y) => circle(x, y, 1.6, "kombuPowder", 0.7),
	),
]);

const harusame = part("harusame", "春雨", [
	...Array.from({ length: 12 }, (_, i) => {
		const offset = (i / 11 - 0.5) * 2 * 18;

		return stroke(
			`M${50 + offset * 0.4} 86 C${50 + offset} 66 ${50 + offset * 1.3} 30 ${50 + offset * 0.8} 12`,
			3,
			"harusame",
		);
	}),
	stroke("M36 30 C44 18 56 40 66 24", 1.2, "harusameDark", 0.6),
	rect(38, 46, 24, 9, 2, "tomato"),
	rect(42, 49, 16, 3, 1, "white", { opacity: 0.8 }),
]);

const hijiki = part("hijiki", "ひじき", [
	ellipse(50, 78, 36, 7, "hijikiShade"),
	...scatter(
		[
			[24, 70, 20],
			[36, 74, -30],
			[48, 70, 50],
			[60, 74, -10],
			[72, 70, 40],
			[30, 62, -40],
			[44, 60, 10],
			[58, 62, -50],
			[70, 60, 30],
			[38, 52, 60],
			[52, 50, -20],
			[64, 52, 25],
			[46, 42, 40],
			[56, 40, -35],
		],
		(x, y, turn) =>
			rect(x - 6, y - 1.4, 12, 3, 1.5, "hijiki", { rotate: turn }),
	),
]);

const kiriboshi = part("kiriboshi", "切り干し大根", [
	...scatter(
		[
			[0, 0, 0],
			[4, 8, 0],
			[-4, 14, 0],
			[2, 22, 0],
			[-2, 30, 0],
		],
		(dx, dy) =>
			stroke(
				`M${12 + dx} ${30 + dy} C26 ${14 + dy} 38 ${54 + dy} 52 ${34 + dy} C66 ${18 + dy} 78 ${50 + dy} ${88 + dx} ${34 + dy}`,
				3.4,
				"kiriboshi",
			),
	),
	stroke(
		"M16 40 C30 26 40 62 54 44 C68 28 78 56 84 44",
		1.4,
		"kiriboshiDark",
		0.6,
	),
]);

export const proteinParts: readonly DishPart[] = [
	chickenBreast,
	wing,
	porkBelly,
	bacon,
	ham,
	mentaiko,
	clam,
	wholeFish,
	shirasu,
	quailEgg,
	onsenEgg,
	atsuage,
	aburaage,
	kamaboko,
	shirataki,
	milkCarton,
	yogurt,
	butter,
	pasta,
	somen,
	soba,
	ramen,
	macaroni,
	mochi,
	riceBag,
	katsuobushi,
	wakame,
	kombu,
	harusame,
	hijiki,
	kiriboshi,
];
