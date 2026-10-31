import type { DishPart } from "./dish-part";
import { circle, ellipse, part, rect, stroke } from "./dish-part-shapes";

// 顔の部品（目・ほっぺ・口・帽子）。食材に重ねて、キャラクターにする（アバター・料理の絵の両方で使う）。
// どれも、正方形の真ん中（50, 50）を中心に描く。目と口は、濃い色と白から選べる（濃い食材の上でも見えるように）。

const faceTints = ["#292720", "#ffffff"] as const;

// れしぽよと同じ、縦長の目。
const eyes = part(
	"face-eyes",
	"目",
	[ellipse(38, 50, 4.9, 9.5, "tint"), ellipse(62, 50, 4.9, 9.5, "tint")],
	faceTints,
);

const eyesSmile = part(
	"face-eyes-smile",
	"にっこり目",
	[
		stroke("M31 54 Q38 43 45 54", 5, "tint"),
		stroke("M55 54 Q62 43 69 54", 5, "tint"),
	],
	faceTints,
);

const eyesWink = part(
	"face-eyes-wink",
	"ウインク",
	[ellipse(38, 50, 4.9, 9.5, "tint"), stroke("M55 54 Q62 43 69 54", 5, "tint")],
	faceTints,
);

const eyesSparkle = part(
	"face-eyes-sparkle",
	"きらきら目",
	[
		circle(38, 50, 7.5, "tint"),
		circle(62, 50, 7.5, "tint"),
		circle(40.8, 46.6, 2.8, "white"),
		circle(64.8, 46.6, 2.8, "white"),
	],
	faceTints,
);

const eyesClosed = part(
	"face-eyes-closed",
	"とじた目",
	[
		stroke("M31 47 Q38 56 45 47", 5, "tint"),
		stroke("M55 47 Q62 56 69 47", 5, "tint"),
	],
	faceTints,
);

const cheeks = part("face-cheeks", "ほっぺ", [
	ellipse(26, 50, 8, 5, "blush", { opacity: 0.85 }),
	ellipse(74, 50, 8, 5, "blush", { opacity: 0.85 }),
]);

const mouthSmile = part(
	"face-mouth-smile",
	"にこ口",
	[stroke("M40 45 Q50 58 60 45", 5, "tint")],
	faceTints,
);

const mouthOpen = part(
	"face-mouth-open",
	"おー口",
	[ellipse(50, 50, 6, 7.5, "tint")],
	faceTints,
);

const mouthCat = part(
	"face-mouth-cat",
	"ω口",
	[stroke("M37 46 Q43.5 56 50 47.5 Q56.5 56 63 46", 4.5, "tint")],
	faceTints,
);

// 白い帽子が、白や薄い地でも見えるよう、少しずらした影の色を、下に敷く。
const chefHat = part("chef-hat", "コック帽", [
	rect(29, 53, 42, 17, 4, "riceShade"),
	circle(34, 42, 15, "riceShade"),
	circle(66, 42, 15, "riceShade"),
	circle(50, 34, 18, "riceShade"),
	rect(30, 52, 40, 16, 4, "white"),
	rect(30, 52, 40, 16, 4, "ink", { opacity: 0.08 }),
	circle(34, 40, 14, "white"),
	circle(66, 40, 14, "white"),
	circle(50, 32, 17, "white"),
	stroke("M42 52 V44 M58 52 V44", 2.5, "ink", 0.1),
]);

export const faceParts: readonly DishPart[] = [
	eyes,
	eyesSmile,
	eyesWink,
	eyesSparkle,
	eyesClosed,
	cheeks,
	mouthSmile,
	mouthOpen,
	mouthCat,
	chefHat,
];
