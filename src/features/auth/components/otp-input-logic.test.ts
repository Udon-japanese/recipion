import { describe, expect, it } from "vitest";
import { OTP_LENGTH } from "#/config/auth";
import otpCases from "../../../../shared-data/test-cases/otp-digits.json";
import {
	createEmptyDigits,
	digitsFromRaw,
	isComplete,
	joinDigits,
} from "./otp-input-logic";

describe("digitsFromRaw", () => {
	it.each(otpCases)("$input → $expected", ({ input, expected }) => {
		expect(joinDigits(digitsFromRaw(input, OTP_LENGTH))).toBe(expected);
	});

	it("足りない桁は空にする", () => {
		expect(digitsFromRaw("１２３", 6)).toEqual(["1", "2", "3", "", "", ""]);
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
