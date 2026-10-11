import { describe, expect, it } from "vitest";
import {
	evaluateViolations,
	isLockedToday,
	toJstDate,
} from "./violation-policy";

// 日本時間の「日付 時:分」から、時刻を作る。
function jst(date: string, time = "12:00"): Date {
	return new Date(`${date}T${time}:00+09:00`);
}

describe("evaluateViolations", () => {
	it("日本時間の日付で数える（UTC の日付ではない）", () => {
		expect(toJstDate(new Date("2026-10-10T15:30:00Z"))).toBe("2026-10-11");
	});

	it("1回目は断る、2回目は警告、3回目はその日の停止", () => {
		const now = jst("2026-10-11");

		expect(evaluateViolations([now], now)).toBe("rejected");
		expect(evaluateViolations([jst("2026-10-11", "09:00"), now], now)).toBe(
			"warned",
		);
		expect(
			evaluateViolations(
				[jst("2026-10-11", "09:00"), jst("2026-10-11", "10:00"), now],
				now,
			),
		).toBe("locked");
	});

	it("前の日の違反は、今日の回数に数えない", () => {
		const now = jst("2026-10-11", "00:10");

		expect(evaluateViolations([jst("2026-10-10", "23:50"), now], now)).toBe(
			"rejected",
		);
	});

	it("前回の3回目から7日以内に、また3回に至れば、アカウントを停止する", () => {
		const now = jst("2026-10-18", "10:30");
		const previous = [
			jst("2026-10-11", "09:00"),
			jst("2026-10-11", "10:00"),
			jst("2026-10-11", "11:00"),
		];
		const today = [jst("2026-10-18", "09:00"), jst("2026-10-18", "10:00"), now];

		expect(evaluateViolations([...previous, ...today], now)).toBe("suspended");
	});

	it("前回の3回目から7日を超えていれば、その日の停止だけ", () => {
		const now = jst("2026-10-19", "12:00");
		const previous = [
			jst("2026-10-11", "09:00"),
			jst("2026-10-11", "10:00"),
			jst("2026-10-11", "11:00"),
		];
		const today = [jst("2026-10-19", "09:00"), jst("2026-10-19", "10:00"), now];

		expect(evaluateViolations([...previous, ...today], now)).toBe("locked");
	});

	it("前の日が2回だけなら、3回に達していないので、停止にならない", () => {
		const now = jst("2026-10-12", "12:00");
		const times = [
			jst("2026-10-11", "09:00"),
			jst("2026-10-11", "10:00"),
			jst("2026-10-12", "09:00"),
			jst("2026-10-12", "10:00"),
			now,
		];

		expect(evaluateViolations(times, now)).toBe("locked");
	});
});

describe("isLockedToday", () => {
	it("今日の違反が3回に達していれば、true", () => {
		const now = jst("2026-10-11", "20:00");

		expect(
			isLockedToday(
				[
					jst("2026-10-11", "09:00"),
					jst("2026-10-11", "10:00"),
					jst("2026-10-11", "11:00"),
				],
				now,
			),
		).toBe(true);
		expect(isLockedToday([jst("2026-10-11", "09:00")], now)).toBe(false);
	});
});
