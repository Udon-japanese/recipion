import { describe, expect, it } from "vitest";
import { parseShoppingMemo } from "./parse-shopping-memo";

const stores = [
	{ id: "aeon", name: "イオン" },
	{ id: "seven", name: "セブン" },
];

function parse(text: string) {
	return parseShoppingMemo(text, stores).map((line) => [
		line.name,
		line.quantity,
		line.unitLabel,
		line.storeId,
	]);
}

describe("parseShoppingMemo（数量）", () => {
	it.each([
		["卵 10個", ["卵", 10, "個", null]],
		["牛乳 1本", ["牛乳", 1, "本", null]],
		["豚こま 300g", ["豚こま", 300, "g", null]],
		["にんにくチューブ", ["にんにくチューブ", 1, null, null]],
		// 単位がない数字は、「個」。
		["牛乳 2", ["牛乳", 2, "個", null]],
		["牛乳2", ["牛乳", 2, "個", null]],
		["レタス 1/2", ["レタス", 0.5, "個", null]],
		["卵 ×3", ["卵", 3, "個", null]],
		["卵x3", ["卵", 3, "個", null]],
		// 計量の単位・数量にならない分量は、名前だけ。
		["塩 少々", ["塩", 1, null, null]],
		["醤油 大さじ2", ["醤油", 1, null, null]],
		// 全角
		["卵　１０個", ["卵", 10, "個", null]],
	])("%s", (line, expected) => {
		expect(parse(line)).toEqual([expected]);
	});

	it("空行は読まない。1行に1つずつ読む", () => {
		expect(parse("\n卵 2\n\n牛乳 1本\n")).toHaveLength(2);
	});
});

describe("parseShoppingMemo（店）", () => {
	it("見出しの行（登録済みの店の名前だけ）で、以降の行の店が切り替わる", () => {
		expect(parse("イオン\n卵 10個\n牛乳\n\n＜セブン＞\nおにぎり 2")).toEqual([
			["卵", 10, "個", "aeon"],
			["牛乳", 1, null, "aeon"],
			["おにぎり", 2, "個", "seven"],
		]);
	});

	it("行の終わりの @店名 は、その項目だけの店。見出しより優先する", () => {
		expect(parse("卵 10個 @イオン\n牛乳\nセブン\nパン @イオン\n水")).toEqual([
			["卵", 10, "個", "aeon"],
			["牛乳", 1, null, null],
			["パン", 1, null, "aeon"],
			["水", 1, null, "seven"],
		]);
	});

	it("登録のない店は、店を付けずに、店の名前を覚えておく", () => {
		const [line] = parseShoppingMemo("卵 @ドンキ", stores);

		expect(line?.storeId).toBeNull();
		expect(line?.unknownStoreName).toBe("ドンキ");
	});

	it("店の名前だけの行でも、登録のない名前は、項目として読む（@ がなければ）", () => {
		expect(parse("ドンキ")).toEqual([["ドンキ", 1, null, null]]);
	});

	it("@店名 だけの行は、登録がなくても見出し（以降は、店なし・名前だけを覚える）", () => {
		const lines = parseShoppingMemo("@ドンキ\n卵", stores);

		expect(lines).toHaveLength(1);
		expect(lines[0]?.unknownStoreName).toBe("ドンキ");
	});

	it("店の名前の大文字・小文字・全角半角の違いは、同じ店", () => {
		expect(
			parseShoppingMemo("卵 @ｲｵﾝ", stores).map((line) => line.storeId),
		).toEqual(["aeon"]);
	});
});
