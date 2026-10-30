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

// 野菜・きのこ・果物の部品。

const miniTomato = part("mini-tomato", "ミニトマト", [
	stroke("M30 44 Q50 20 70 44", 2.5, "leafDark"),
	...scatter(
		[
			[30, 62],
			[70, 62],
			[50, 40],
		],
		(x, y) => [
			circle(x, y + 1, 17, "tomatoDark"),
			circle(x, y, 16.5, "tomato"),
			shine(x - 6, y - 6, 4.5, 2, -35, 0.38),
			ellipse(x, y - 15, 6, 1.8, "leafDark"),
			ellipse(x, y - 15, 6, 1.8, "leafDark", { rotate: 70 }),
		],
	).flat(),
]);

const paprika = part(
	"paprika",
	"パプリカ",
	[
		path(
			"M26 40 C18 44 16 60 22 72 C30 86 70 86 78 72 C84 60 82 44 74 40 C66 34 34 34 26 40 Z",
			"tint",
		),
		shade("M50 36 C66 34 74 40 76 44 C82 58 82 66 78 72 C70 84 56 86 50 86 Z"),
		stroke("M42 38 C38 54 40 72 44 84", 2, "ink", 0.15),
		stroke("M58 38 C62 54 60 72 56 84", 2, "ink", 0.15),
		path("M36 38 C42 31 58 31 64 38 C58 36 42 36 36 38 Z", "leafDark"),
		rect(47, 20, 6, 17, 3, "leafDark"),
		shine(32, 54, 4, 9, 10, 0.35),
	],
	["#e0452f", "#f4b81c", "#f08a2c"],
);

const shiso = part("shiso", "大葉", [
	path(
		"M50 14 C74 24 88 46 72 70 C64 80 56 84 50 90 C44 84 36 80 28 70 C12 46 26 24 50 14 Z",
		"leaf",
	),
	shade("M50 14 C74 24 88 46 72 70 C64 80 56 84 50 90 Z", 0.1),
	stroke("M50 24 L50 86", 2, "leafDark"),
	stroke("M50 46 L35 36", 2, "leafDark"),
	stroke("M50 46 L65 36", 2, "leafDark"),
	stroke("M50 64 L33 54", 2, "leafDark"),
	stroke("M50 64 L67 54", 2, "leafDark"),
]);

const shimeji = part("shimeji", "しめじ", [
	rect(26, 40, 8, 40, 3, "mushroomStem"),
	rect(46, 36, 8, 46, 3, "mushroomStem"),
	rect(66, 42, 8, 40, 3, "mushroomStem"),
	path("M20 84 C24 76 76 76 80 84 L78 90 L22 90 Z", "mushroomStem"),
	ellipse(30, 42, 15, 11, "shimeji2"),
	ellipse(50, 36, 17, 12, "shimeji2"),
	ellipse(70, 44, 15, 11, "shimeji2"),
	ellipse(26, 40, 4, 2, "mushroomStem", { rotate: -20, opacity: 0.6 }),
	ellipse(46, 34, 4, 2, "mushroomStem", { rotate: -20, opacity: 0.6 }),
	ellipse(66, 42, 4, 2, "mushroomStem", { rotate: -20, opacity: 0.6 }),
]);

const enoki = part("enoki", "えのき", [
	...scatter(
		[
			[24, 20],
			[34, 16],
			[44, 14],
			[56, 14],
			[66, 16],
			[76, 20],
		],
		(x, y) =>
			stroke(`M${x} ${y} L${50 + (x - 50) * 0.35} 78`, 4, "mushroomStem"),
	),
	...scatter(
		[
			[24, 20],
			[34, 16],
			[44, 14],
			[56, 14],
			[66, 16],
			[76, 20],
		],
		(x, y) => circle(x, y, 5, "enoki2"),
	),
	rect(38, 74, 24, 16, 5, "enokiBase"),
]);

const eringi = part("eringi", "エリンギ", [
	path("M36 40 C32 60 34 80 38 88 L62 88 C66 80 68 60 64 40 Z", "mushroomStem"),
	shade("M52 40 L64 40 C68 60 66 80 62 88 L52 88 Z", 0.08),
	ellipse(50, 36, 28, 15, "eringiCap"),
	ellipse(42, 31, 13, 5, "eringiCapLight", { rotate: -8 }),
]);

const maitake = part("maitake", "まいたけ", [
	rect(42, 66, 16, 22, 5, "mushroomStem"),
	...scatter(
		[
			[28, 56, -28],
			[72, 56, 28],
			[36, 42, -12],
			[64, 42, 12],
			[50, 34, 0],
		],
		(x, y, turn) => ellipse(x, y, 20, 9, "maitake", { rotate: turn }),
	),
	...scatter(
		[
			[32, 62, -20],
			[68, 62, 20],
			[44, 50, -8],
			[58, 48, 8],
			[50, 42, 0],
		],
		(x, y, turn) => ellipse(x, y, 16, 7, "maitakeDark", { rotate: turn }),
	),
	...scatter(
		[
			[36, 48, -12],
			[62, 48, 12],
			[50, 40, 0],
		],
		(x, y, turn) => ellipse(x, y, 12, 4.5, "maitake", { rotate: turn }),
	),
]);

const garlic = part("garlic", "にんにく", [
	path(
		"M50 16 C52 28 72 34 76 56 C80 76 64 88 50 88 C36 88 20 76 24 56 C28 34 48 28 50 16 Z",
		"garlic",
	),
	shade("M50 16 C52 28 72 34 76 56 C80 76 64 88 50 88 Z", 0.1),
	stroke("M50 34 C42 52 40 72 44 86", 2, "garlicDark"),
	stroke("M50 34 C58 52 60 72 56 86", 2, "garlicDark"),
	stroke("M50 34 C34 46 30 66 34 80", 2, "garlicDark"),
	stroke("M50 34 C66 46 70 66 66 80", 2, "garlicDark"),
	stroke("M50 16 C50 12 52 10 54 8", 3, "garlicDark"),
	stroke("M44 90 L42 94", 2, "garlicDark"),
	stroke("M50 90 L50 95", 2, "garlicDark"),
	stroke("M56 90 L58 94", 2, "garlicDark"),
]);

const ginger = part("ginger", "しょうが", [
	ellipse(46, 62, 26, 14, "gingerDark", { rotate: -14 }),
	ellipse(72, 48, 14, 9, "gingerDark", { rotate: -30 }),
	ellipse(26, 66, 12, 9, "gingerDark"),
	ellipse(54, 78, 14, 8, "gingerDark"),
	ellipse(46, 58, 26, 14, "ginger", { rotate: -14 }),
	ellipse(72, 44, 14, 9, "ginger", { rotate: -30 }),
	ellipse(26, 62, 12, 9, "ginger"),
	ellipse(54, 74, 14, 8, "ginger"),
	stroke("M36 50 C40 56 42 60 40 66", 1.8, "gingerDark"),
	stroke("M56 50 C58 56 60 60 58 66", 1.8, "gingerDark"),
	circle(80, 40, 3, "gingerPink"),
]);

const lettuce = part("lettuce", "レタス", [
	...scatter(
		Array.from({ length: 10 }, (_, i) => {
			const angle = (i / 10) * Math.PI * 2;

			return [50 + Math.cos(angle) * 28, 52 + Math.sin(angle) * 26] as const;
		}),
		(x, y) => circle(x, y, 13, "lettuce"),
	),
	circle(50, 52, 30, "lettuce"),
	ellipse(50, 52, 24, 22, "lettuceLight"),
	stroke("M50 78 C50 60 50 44 50 30", 2, "lettuceDark"),
	stroke("M50 70 C40 58 34 48 30 40", 2, "lettuceDark"),
	stroke("M50 70 C60 58 66 48 70 40", 2, "lettuceDark"),
	stroke("M50 58 C44 52 40 48 38 44", 2, "lettuceDark"),
	stroke("M50 58 C56 52 60 48 62 44", 2, "lettuceDark"),
]);

const hakusai = part("hakusai", "白菜", [
	path(
		"M32 20 C18 40 20 70 34 88 L66 88 C80 70 82 40 68 20 C58 14 42 14 32 20 Z",
		"hakusai",
	),
	path(
		"M32 20 C42 14 58 14 68 20 C70 30 72 38 70 46 C60 40 40 40 30 46 C28 38 30 28 32 20 Z",
		"cabbage",
	),
	stroke("M50 18 L50 86", 2, "hakusaiDark"),
	stroke("M42 40 C40 58 40 74 42 86", 2, "hakusaiDark"),
	stroke("M58 40 C60 58 60 74 58 86", 2, "hakusaiDark"),
	stroke("M34 50 C34 64 36 76 38 84", 2, "hakusaiDark"),
	stroke("M66 50 C66 64 64 76 62 84", 2, "hakusaiDark"),
	stroke("M40 30 C46 24 54 24 60 30", 2, "cabbageDark"),
]);

const sweetPotato = part("sweet-potato", "さつまいも", [
	path(
		"M12 56 C18 34 50 30 84 40 C92 44 90 58 80 66 C56 78 22 76 12 56 Z",
		"sweetPotato",
	),
	shade("M12 56 C22 70 56 80 80 66 C90 58 92 44 84 40 C60 62 30 66 12 56 Z"),
	path(
		"M72 36 C84 38 92 46 90 56 C86 64 78 68 70 68 C74 56 74 46 72 36 Z",
		"sweetPotatoFlesh",
	),
	stroke("M72 44 C80 46 84 52 82 60", 2, "sweetPotatoFleshDark"),
	stroke("M26 52 C34 48 44 46 54 46", 2, "sweetPotatoDark", 0.5),
	stroke("M18 62 L12 66", 2, "sweetPotatoDark"),
]);

const burdock = part("burdock", "ごぼう", [
	rect(6, 42, 88, 9, 4.5, "burdock", { rotate: -22 }),
	rect(8, 58, 84, 8, 4, "burdockDark", { rotate: -16 }),
	rect(10, 72, 80, 8, 4, "burdock", { rotate: -10 }),
	...scatter(
		[
			[30, 40, -22],
			[56, 31, -22],
			[34, 62, -16],
			[62, 58, -16],
		],
		(x, y, turn) => rect(x, y, 5, 3, 1, "burdockDark", { rotate: turn }),
	),
	ellipse(88, 24, 4, 5, "burdockFlesh"),
]);

const lotusRoot = part("lotus-root", "れんこん", [
	circle(50, 52, 36, "lotusDark"),
	circle(50, 52, 33, "lotus"),
	...scatter(
		Array.from({ length: 7 }, (_, i) => {
			const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;

			return [50 + Math.cos(angle) * 19, 52 + Math.sin(angle) * 19] as const;
		}),
		(x, y) => circle(x, y, 6.5, "lotusDark"),
	),
	circle(50, 52, 6, "lotusDark"),
	...scatter(
		Array.from({ length: 7 }, (_, i) => {
			const angle = (i / 7) * Math.PI * 2 - Math.PI / 2;

			return [50 + Math.cos(angle) * 19, 52 + Math.sin(angle) * 19] as const;
		}),
		(x, y) => circle(x, y - 1, 3.2, "lotus"),
	),
]);

const okra = part("okra", "オクラ", [
	path(
		"M14 62 C22 42 52 36 82 28 C88 28 90 32 88 38 C76 60 42 74 20 70 C14 68 12 64 14 62 Z",
		"okra",
	),
	shade("M14 62 C20 70 44 74 76 54 C82 50 86 44 88 38 C60 56 36 64 14 62 Z"),
	stroke("M22 62 C40 54 62 44 82 34", 1.8, "okraDark"),
	path("M10 60 C12 56 18 56 20 60 C18 66 12 68 10 64 Z", "leafDark"),
	circle(72, 78, 13, "okraSlice"),
	...scatter(
		Array.from({ length: 5 }, (_, i) => {
			const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;

			return [72 + Math.cos(angle) * 6, 78 + Math.sin(angle) * 6] as const;
		}),
		(x, y) => circle(x, y, 2.4, "okraSeed"),
	),
]);

const taro = part("taro", "里芋", [
	ellipse(50, 58, 32, 28, "taro"),
	shade("M50 86 C72 86 82 70 82 58 C70 74 60 78 50 78 Z", 0.12),
	stroke("M22 56 C40 64 60 64 78 56", 2, "taroDark"),
	stroke("M26 70 C42 76 58 76 74 70", 2, "taroDark"),
	stroke("M30 44 C44 50 56 50 70 44", 2, "taroDark"),
	ellipse(50, 32, 8, 5, "taroDark"),
	stroke("M44 30 L40 24", 2, "taroDark"),
	stroke("M56 30 L60 24", 2, "taroDark"),
]);

const cauliflower = part("cauliflower", "カリフラワー", [
	path(
		"M16 60 C18 82 40 90 50 88 C60 90 82 82 84 60 C72 72 58 74 50 74 C42 74 28 72 16 60 Z",
		"leaf",
	),
	stroke("M50 74 L50 88", 2, "leafDark"),
	...scatter(
		[
			[30, 50],
			[44, 38],
			[60, 36],
			[72, 48],
			[40, 58],
			[58, 58],
			[50, 48],
		],
		(x, y) => circle(x, y + 1.5, 15, "cauliflowerDark"),
	),
	...scatter(
		[
			[30, 50],
			[44, 38],
			[60, 36],
			[72, 48],
			[40, 58],
			[58, 58],
			[50, 48],
		],
		(x, y) => circle(x, y, 14.5, "cauliflower"),
	),
]);

const edamame = part("edamame", "枝豆", [
	ellipse(46, 66, 36, 11, "edamameDark", { rotate: 8 }),
	ellipse(46, 64, 35, 10, "edamame", { rotate: 8 }),
	...scatter(
		[
			[26, 60],
			[46, 64],
			[66, 68],
		],
		(x, y) => circle(x, y, 8, "edamameLight"),
	),
	ellipse(52, 34, 36, 11, "edamameDark", { rotate: -12 }),
	ellipse(52, 32, 35, 10, "edamame", { rotate: -12 }),
	...scatter(
		[
			[32, 38],
			[52, 32],
			[72, 28],
		],
		(x, y) => circle(x, y, 8, "edamameLight"),
	),
]);

const greenBeans = part("green-beans", "いんげん", [
	stroke("M12 72 C30 62 60 42 88 24", 8, "leafDark"),
	stroke("M12 72 C30 62 60 42 88 24", 5.5, "leaf"),
	stroke("M16 88 C40 76 62 60 86 46", 8, "leafDark"),
	stroke("M16 88 C40 76 62 60 86 46", 5.5, "leaf"),
	stroke("M10 52 C30 46 52 34 76 14", 8, "leafDark"),
	stroke("M10 52 C30 46 52 34 76 14", 5.5, "leaf"),
	stroke("M14 70 C28 62 40 56 50 50", 1.6, "leafLight"),
]);

const mixedVeg = part("mixed-veg", "ミックスベジタブル", [
	...scatter(
		[
			[28, 36],
			[44, 30],
			[60, 40],
			[74, 34],
			[34, 56],
			[52, 52],
			[70, 62],
			[44, 74],
			[62, 80],
			[26, 76],
		],
		(x, y) => ellipse(x, y, 7, 5.5, "cornKernel", { rotate: x * 3 }),
	),
	...scatter(
		[
			[38, 44, 12],
			[66, 50, -18],
			[30, 66, 30],
			[56, 66, -8],
			[78, 76, 20],
			[48, 86, 0],
		],
		(x, y, turn) => rect(x - 5, y - 5, 10, 10, 2, "carrot", { rotate: turn }),
	),
	...scatter(
		[
			[22, 50],
			[52, 40],
			[80, 52],
			[40, 84],
			[70, 66],
			[24, 86],
		],
		(x, y) => circle(x, y, 5.5, "leaf"),
	),
]);

const frenchFries = part("french-fries", "フライドポテト", [
	...scatter(
		[
			[34, 30, -8],
			[44, 22, -2],
			[54, 18, 4],
			[64, 24, 10],
			[40, 36, -4],
			[52, 32, 2],
			[62, 38, 8],
		],
		(x, y, turn) => rect(x - 4, y, 8, 40, 2, "fries", { rotate: turn }),
	),
	path("M24 54 L76 54 L70 88 L30 88 Z", "friesBox"),
	path("M24 54 L76 54 L75 60 L25 60 Z", "friesBoxDark"),
	path("M42 70 Q50 64 58 70 Q50 82 42 70 Z", "white", 0.9),
]);

const apple = part(
	"apple",
	"りんご",
	[
		path(
			"M50 32 C40 22 18 26 18 48 C18 70 34 88 46 85 C49 84 51 84 54 85 C66 88 82 70 82 48 C82 26 60 22 50 32 Z",
			"tint",
		),
		shade(
			"M54 85 C66 88 82 70 82 48 C82 36 74 28 66 26 C72 40 70 70 54 85 Z",
			0.14,
		),
		shine(32, 44, 4, 9, 12, 0.4),
		rect(48, 14, 4, 18, 2, "woodDark"),
		path("M54 22 C62 14 72 16 74 20 C68 28 58 28 54 22 Z", "leaf"),
	],
	["#d9402f", "#8cc84a", "#f08a8a"],
);

const banana = part("banana", "バナナ", [
	path(
		"M18 28 C18 62 48 84 86 66 C88 64 88 60 86 58 C58 66 40 54 34 26 C32 22 20 22 18 28 Z",
		"banana",
	),
	shade(
		"M86 66 C88 64 88 60 86 58 C58 66 40 54 34 26 C40 56 56 74 86 66 Z",
		0.14,
	),
	stroke("M26 30 C28 52 46 68 72 68", 1.8, "bananaDark", 0.6),
	rect(16, 18, 14, 10, 3, "bananaTip"),
	ellipse(86, 62, 3.5, 4.5, "bananaTip", { rotate: -20 }),
]);

const citrus = part(
	"citrus",
	"柑橘",
	[
		circle(50, 56, 32, "tint"),
		shade("M50 88 C72 88 82 70 82 56 C72 74 62 80 50 80 Z", 0.14),
		...scatter(
			[
				[36, 50],
				[56, 42],
				[66, 60],
				[44, 68],
				[30, 64],
				[58, 76],
				[72, 46],
			],
			(x, y) => circle(x, y, 1.2, "ink", 0.12),
		),
		shine(36, 40, 5, 9, 30, 0.38),
		circle(50, 25, 3.5, "leafDark"),
		path("M52 22 C58 12 70 12 74 18 C68 26 58 28 52 22 Z", "leaf"),
	],
	["#f28c28", "#f4cf3d", "#8bc34a"],
);

const kiwi = part("kiwi", "キウイ", [
	circle(50, 52, 36, "kiwiSkin"),
	circle(50, 52, 31, "kiwi"),
	circle(50, 52, 22, "kiwiLight"),
	circle(50, 52, 8, "kiwiCore"),
	...scatter(
		Array.from({ length: 14 }, (_, i) => {
			const angle = (i / 14) * Math.PI * 2;

			return [50 + Math.cos(angle) * 15, 52 + Math.sin(angle) * 15] as const;
		}),
		(x, y) => ellipse(x, y, 1.3, 2.2, "ink", { opacity: 0.75, rotate: 0 }),
	),
]);

const pear = part("pear", "梨", [
	path(
		"M50 20 C42 20 40 28 38 36 C30 44 20 52 22 66 C24 80 38 87 50 87 C62 87 76 80 78 66 C80 52 70 44 62 36 C60 28 58 20 50 20 Z",
		"pear",
	),
	shade(
		"M50 87 C62 87 76 80 78 66 C80 52 70 44 62 36 C66 56 64 78 50 87 Z",
		0.12,
	),
	...scatter(
		[
			[40, 54],
			[56, 48],
			[50, 66],
			[64, 62],
			[36, 70],
		],
		(x, y) => circle(x, y, 1.3, "pearDark"),
	),
	shine(34, 56, 4, 9, 12, 0.35),
	rect(48, 12, 4, 12, 2, "woodDark"),
	path("M54 18 C62 12 70 14 72 18 C66 24 58 24 54 18 Z", "leaf"),
]);

const peach = part("peach", "桃", [
	circle(50, 56, 31, "peach"),
	ellipse(62, 58, 20, 27, "peachDark", { opacity: 0.55 }),
	stroke("M50 28 C42 44 44 66 54 84", 2.5, "peachDark"),
	shine(36, 46, 4, 9, 20, 0.4),
	rect(48, 16, 3.5, 12, 1.5, "woodDark"),
	path("M52 22 C60 12 74 14 76 20 C68 28 58 28 52 22 Z", "leaf"),
]);

const persimmon = part(
	"persimmon",
	"柿",
	[
		ellipse(50, 60, 34, 27, "tint"),
		shade("M50 87 C74 87 84 70 84 58 C74 74 62 76 50 76 Z", 0.14),
		shine(32, 52, 4, 8, 20, 0.35),
		ellipse(50, 36, 14, 4.5, "leafDark"),
		ellipse(50, 36, 14, 4.5, "leafDark", { rotate: 60 }),
		ellipse(50, 36, 14, 4.5, "leafDark", { rotate: 120 }),
		rect(48, 22, 4, 10, 2, "woodDark"),
	],
	["#f08a2c", "#e0652a"],
);

const strawberry = part("strawberry", "いちご", [
	path(
		"M50 88 C30 78 14 58 18 42 C22 28 40 28 50 34 C60 28 78 28 82 42 C86 58 70 78 50 88 Z",
		"strawberry",
	),
	shade(
		"M50 88 C70 78 86 58 82 42 C78 36 72 32 66 30 C74 50 66 76 50 88 Z",
		0.14,
	),
	...scatter(
		[
			[34, 48],
			[48, 44],
			[62, 46],
			[72, 52],
			[40, 60],
			[56, 58],
			[66, 66],
			[30, 62],
			[48, 72],
			[58, 78],
		],
		(x, y) => ellipse(x, y, 1.6, 2.4, "strawberrySeed"),
	),
	...scatter(
		[
			[0, 0, -60],
			[0, 0, -30],
			[0, 0, 0],
			[0, 0, 30],
			[0, 0, 60],
		],
		(_x, _y, turn) => ellipse(50, 34, 13, 4, "leaf", { rotate: turn + 90 }),
	),
	rect(48.5, 18, 3.5, 12, 1.5, "leafDark"),
]);

const grapes = part(
	"grapes",
	"ぶどう",
	[
		stroke("M55 28 Q56 16 60 8", 3, "woodDark"),
		path("M58 14 C66 6 78 8 80 14 C74 22 62 22 58 14 Z", "leaf"),
		...scatter(
			[
				[28, 34],
				[46, 32],
				[64, 34],
				[82, 38],
				[37, 50],
				[55, 50],
				[73, 54],
				[46, 66],
				[64, 70],
				[55, 82],
			],
			(x, y) => [circle(x, y, 9.5, "tint"), circle(x, y + 3, 9.5, "ink", 0.08)],
		).flat(),
		...scatter(
			[
				[25, 31],
				[43, 29],
				[61, 31],
				[34, 47],
				[52, 47],
				[43, 63],
			],
			(x, y) => circle(x, y, 2, "white", 0.55),
		),
	],
	["#6a3f8a", "#a5d96a", "#c8283a"],
);

const blueberry = part("blueberry", "ブルーベリー", [
	...scatter(
		[
			[32, 58],
			[66, 58],
			[50, 34],
		],
		(x, y) => [
			circle(x, y, 17, "blueberry"),
			circle(x, y - 4, 13, "blueberryLight", 0.5),
			circle(x, y - 6, 4.5, "blueberryDark"),
			circle(x, y - 6, 2, "blueberryLight"),
			shine(x - 7, y - 7, 3.5, 1.8, -35, 0.4),
		],
	).flat(),
]);

const cherry = part("cherry", "さくらんぼ", [
	stroke("M32 58 C34 38 44 24 54 14", 2.5, "leafDark"),
	stroke("M68 58 C66 38 62 24 54 14", 2.5, "leafDark"),
	path("M54 14 C62 6 76 8 78 14 C70 22 58 22 54 14 Z", "leaf"),
	...scatter(
		[
			[30, 72],
			[70, 72],
		],
		(x, y) => [
			circle(x, y, 17, "cherryDark"),
			circle(x - 1, y - 1, 16, "cherry"),
			shine(x - 6, y - 7, 4, 2, -35, 0.45),
		],
	).flat(),
]);

const pineapple = part("pineapple", "パイナップル", [
	path("M50 38 L36 6 L48 22 L56 2 L62 22 L74 8 L62 38 Z", "leaf"),
	path("M50 38 L44 14 L50 26 L58 12 L58 38 Z", "leafDark"),
	ellipse(50, 64, 26, 30, "pineappleDark"),
	ellipse(50, 63, 25, 29, "pineapple"),
	stroke("M32 42 L68 84", 1.8, "pineappleDark"),
	stroke("M26 54 L58 90", 1.8, "pineappleDark"),
	stroke("M42 38 L72 74", 1.8, "pineappleDark"),
	stroke("M68 42 L32 84", 1.8, "pineappleDark"),
	stroke("M74 54 L42 90", 1.8, "pineappleDark"),
	stroke("M58 38 L28 74", 1.8, "pineappleDark"),
]);

const avocado = part("avocado", "アボカド", [
	path(
		"M50 12 C38 12 36 26 32 36 C22 46 16 58 22 72 C28 86 42 90 50 90 C58 90 72 86 78 72 C84 58 78 46 68 36 C64 26 62 12 50 12 Z",
		"avocadoSkin",
	),
	path(
		"M50 18 C41 18 40 29 37 38 C28 48 23 59 28 71 C33 82 44 85 50 85 C56 85 67 82 72 71 C77 59 72 48 63 38 C60 29 59 18 50 18 Z",
		"avocadoFlesh",
	),
	path(
		"M50 34 C42 34 38 44 32 52 C28 62 32 74 40 78 C46 80 54 80 60 78 C68 74 72 62 68 52 C62 44 58 34 50 34 Z",
		"avocadoLight",
		0.55,
	),
	circle(50, 62, 14, "avocadoPit"),
	shine(45, 56, 4, 6, 20, 0.35),
]);

export const produceParts: readonly DishPart[] = [
	miniTomato,
	paprika,
	shiso,
	shimeji,
	enoki,
	eringi,
	maitake,
	garlic,
	ginger,
	lettuce,
	hakusai,
	sweetPotato,
	burdock,
	lotusRoot,
	okra,
	taro,
	cauliflower,
	edamame,
	greenBeans,
	mixedVeg,
	frenchFries,
	apple,
	banana,
	citrus,
	kiwi,
	pear,
	peach,
	persimmon,
	strawberry,
	grapes,
	blueberry,
	cherry,
	pineapple,
	avocado,
];
