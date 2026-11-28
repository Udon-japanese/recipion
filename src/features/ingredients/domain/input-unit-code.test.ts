import { describe, expect, it } from "vitest";
import { fixLegacyUnit } from "./input-unit-code";

describe("fixLegacyUnit（移行：単位名と inputUnitCode に残る英語のコードを直す）", () => {
	it.each([
		{ unitLabel: "パック", code: "pack", expected: ["パック", "パック"] },
		// 単位名があれば、対応表（パック・ボトル）より、単位名を使う。
		{ unitLabel: "房", code: "pack", expected: ["房", "房"] },
		{ unitLabel: "本", code: "bottle", expected: ["本", "本"] },
		// 単位名も英語（在庫の画面で、「pack」のロットの換算を覚えた記憶）。
		{ unitLabel: "pack", code: "pack", expected: ["パック", "パック"] },
		{ unitLabel: "bag", code: null, expected: ["袋", null] },
		// 単位名がなければ、対応表。
		{ unitLabel: null, code: "can", expected: [null, "缶"] },
	])("$unitLabel・$code → $expected", ({ unitLabel, code, expected }) => {
		const [expectedLabel, expectedCode] = expected;

		expect(fixLegacyUnit({ unitLabel, inputUnitCode: code })).toEqual({
			unitLabel: expectedLabel,
			inputUnitCode: expectedCode,
		});
	});

	it.each([
		{ unitLabel: "パック", code: "パック" },
		{ unitLabel: "個", code: "count" },
		{ unitLabel: "g", code: "g" },
		{ unitLabel: null, code: null },
	])(
		"英語のコードがなければ null（$unitLabel・$code）",
		({ unitLabel, code }) => {
			expect(fixLegacyUnit({ unitLabel, inputUnitCode: code })).toBeNull();
		},
	);
});
