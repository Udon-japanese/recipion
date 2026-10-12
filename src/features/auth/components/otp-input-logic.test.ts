import { describe, expect, it } from "vitest";
import {
	createEmptyDigits,
	digitsFromRaw,
	extractDigits,
	isComplete,
	joinDigits,
} from "./otp-input-logic";

describe("extractDigits", () => {
	it("全角の数字を半角にして、数字以外を取り除く", () => {
		expect(extractDigits("１２ー３a 4")).toBe("1234");
		expect(extractDigits("abc")).toBe("");
	});
});

describe("digitsFromRaw", () => {
	it("入力欄の中身から、数字だけを取り出し、桁数の配列にする（足りない桁は空）", () => {
		expect(digitsFromRaw("１２３", 6)).toEqual(["1", "2", "3", "", "", ""]);
		expect(digitsFromRaw("12 34-56", 6)).toEqual([
			"1",
			"2",
			"3",
			"4",
			"5",
			"6",
		]);
	});

	it("桁数を超えた分は、捨てる。数字がなければ、すべて空", () => {
		expect(digitsFromRaw("1234567", 6)).toEqual(["1", "2", "3", "4", "5", "6"]);
		expect(digitsFromRaw("あいう", 6)).toEqual(createEmptyDigits(6));
	});
});

describe("isComplete / joinDigits", () => {
	it("全部の桁が埋まったときだけ、完成とする", () => {
		expect(isComplete(["1", "2", "3"])).toBe(true);
		expect(isComplete(["1", "", "3"])).toBe(false);
		expect(isComplete([])).toBe(false);
		expect(joinDigits(["1", "2", "3"])).toBe("123");
	});
});
