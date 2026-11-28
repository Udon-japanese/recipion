import { describe, expect, it } from "vitest";
import { fixLegacyInputUnitCode } from "./input-unit-code";

describe("fixLegacyInputUnitCode（移行：英語のコードを、呼び名から作り直す）", () => {
	it.each([
		{ code: "pack", unitLabel: "パック", expected: "パック" },
		// 呼び名があれば、対応表（パック・ボトル）より、呼び名を使う。
		{ code: "pack", unitLabel: "房", expected: "房" },
		{ code: "bottle", unitLabel: "本", expected: "本" },
		{ code: "bag", unitLabel: "袋", expected: "袋" },
		// 呼び名がなければ、対応表。
		{ code: "can", unitLabel: null, expected: "缶" },
		// 英語のコードでなければ、そのまま。
		{ code: "パック", unitLabel: "パック", expected: "パック" },
		{ code: "count", unitLabel: "個", expected: "count" },
		{ code: "g", unitLabel: "g", expected: "g" },
	])("$code（$unitLabel）→ $expected", ({ code, unitLabel, expected }) => {
		expect(fixLegacyInputUnitCode(code, unitLabel)).toBe(expected);
	});
});
