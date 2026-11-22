import { describe, expect, it } from "vitest";
import {
	checkClientVersion,
	compareVersions,
	parseClientHeader,
} from "./client-version";

const minimums = { android: "1.2.0", ios: "2.0.0", web: "0.0.0" };

describe("parseClientHeader", () => {
	it.each([
		["android/1.2.3", { platform: "android", version: [1, 2, 3] }],
		[" ios/10.0.0 ", { platform: "ios", version: [10, 0, 0] }],
		["web/0.0.1", { platform: "web", version: [0, 0, 1] }],
	])("%s を読む", (value, expected) => {
		expect(parseClientHeader(value)).toEqual(expected);
	});

	it.each([
		"android",
		"android/1.2",
		"android/1.2.3-beta",
		"windows/1.0.0",
		"Android/1.0.0",
		"",
	])("%s は読めない", (value) => {
		expect(parseClientHeader(value)).toBeNull();
	});
});

describe("compareVersions", () => {
	it.each([
		[[1, 2, 0], [1, 2, 0], 0],
		[[1, 1, 9], [1, 2, 0], -1],
		[[1, 10, 0], [1, 9, 0], 1],
		[[2, 0, 0], [1, 99, 99], 1],
	] as const)("%j と %j", (a, b, sign) => {
		expect(Math.sign(compareVersions(a, b))).toBe(sign);
	});
});

describe("checkClientVersion", () => {
	it.each([
		[null, "missing"],
		["", "missing"],
		["android/1.1.9", "too-old"],
		["android/1.2.0", "ok"],
		["android/1.3.0", "ok"],
		["ios/1.9.9", "too-old"],
		["ios/2.0.0", "ok"],
		["web/0.0.0", "ok"],
		["windows/1.0.0", "invalid"],
		["android/abc", "invalid"],
	])("%s は %s", (header, expected) => {
		expect(checkClientVersion(header, minimums)).toBe(expected);
	});

	it("最も古い版の設定が壊れていれば、例外（設定の誤りに気づくため）", () => {
		expect(() =>
			checkClientVersion("android/1.0.0", { ...minimums, android: "1.0" }),
		).toThrow();
	});
});
