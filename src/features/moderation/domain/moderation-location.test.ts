import { describe, expect, it } from "vitest";

import { excerptAt, locateInText } from "./moderation-location";

describe("locateInText", () => {
	it.each([
		["1行の中", "玉ねぎ\nだめな語を\n切る", "だめ", { start: 4, end: 6 }],
		["行をまたぐ（両方の行）", "前の行\nだ\nめ", "だめ", { start: 4, end: 7 }],
		["当たらない", "玉ねぎを切る", "だめ", null],
	] as const)("%s", (_label, text, term, expected) => {
		// 区切り（改行）を除いて照らす、照合の代わり。
		const matches = (part: string) => part.replace(/\n/gu, "").includes(term);

		expect(locateInText(text, matches)).toEqual(expected);
	});
});

describe("excerptAt", () => {
	const longLine = `${"あ".repeat(40)}だめ${"い".repeat(40)}`;

	it.each([
		[
			"短い行は、その行すべて",
			"1行目\n問題の行\n3行目",
			{ start: 4, end: 6 },
			"問題の行",
		],
		[
			"行をまたぐなら、その行すべて（/ でつなぐ）",
			"1行目\n前半\n後半",
			{ start: 4, end: 9 },
			"前半 / 後半",
		],
		[
			"長い行は、当たった部分と前後の数文字",
			longLine,
			{ start: 40, end: 42 },
			`…${"あ".repeat(15)}だめ${"い".repeat(15)}…`,
		],
		[
			"範囲がなければ、文章の先頭から（長ければ切る）",
			longLine,
			{},
			`${longLine.slice(0, 60)}…`,
		],
	] as const)("%s", (_label, text, range, expected) => {
		expect(excerptAt(text, range)).toBe(expected);
	});
});
