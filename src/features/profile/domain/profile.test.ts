import { describe, expect, it } from "vitest";
import {
	displayNameMaxLength,
	generateHandle,
	handleMaxLength,
	handleMinLength,
	normalizeDisplayName,
	normalizeHandle,
	validateDisplayName,
	validateHandle,
} from "./profile";

describe("validateDisplayName", () => {
	it("表示名の問題を返す（なければ null）", () => {
		const cases: [string, string | null][] = [
			["れしぴょなー", null],
			["たろう", null],
			["", "empty"],
			["taro@example.com", "contains-at"],
			["たろう＠メール", "contains-at"],
			["a\nb", "control-characters"],
			["あ".repeat(displayNameMaxLength), null],
			["あ".repeat(displayNameMaxLength + 1), "too-long"],
		];

		expect(cases.map(([name]) => validateDisplayName(name))).toEqual(
			cases.map(([, expected]) => expected),
		);
	});

	it("前後の空白は、除いてから、確認する", () => {
		expect(normalizeDisplayName("  たろう　")).toBe("たろう");
		expect(validateDisplayName(normalizeDisplayName("   "))).toBe("empty");
	});
});

describe("normalizeHandle / validateHandle", () => {
	it("全角・大文字・先頭の @ をそろえる", () => {
		expect(normalizeHandle("＠Ｔａｒｏ_１")).toBe("taro_1");
		expect(normalizeHandle("  @Taro-Cook ")).toBe("taro-cook");
	});

	it("ハンドルの問題を返す（なければ null）", () => {
		const cases: [string, string | null][] = [
			["taro", null],
			["taro_cook-1", null],
			["user-8f3k2a1b", null],
			// 下限と上限は、それぞれ、ちょうど（通る）と、1つ外（止まる）。
			["a".repeat(handleMinLength - 1), "too-short"],
			["a".repeat(handleMinLength), null],
			["a".repeat(handleMaxLength), null],
			["a".repeat(handleMaxLength + 1), "too-long"],
			["たろう", "invalid-characters"],
			["taro cook", "invalid-characters"],
			["Taro", "invalid-characters"],
			["admin", "reserved"],
			["recipion", "reserved"],
		];

		expect(cases.map(([handle]) => validateHandle(handle))).toEqual(
			cases.map(([, expected]) => expected),
		);
	});
});

describe("generateHandle", () => {
	it("user- に、決まった文字種の8文字を続ける。規則を満たす", () => {
		let index = 0;
		const handle = generateHandle((size) => index++ % size);

		expect(handle).toBe("user-abcdefgh");
		expect(validateHandle(handle)).toBeNull();
	});
});
