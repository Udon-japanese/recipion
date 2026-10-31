import { describe, expect, it } from "vitest";
import {
	addDaysToDate,
	addMonthsToDate,
	buildMonthGrid,
	daysInMonth,
	describeDate,
	formatDisplayDate,
	parseIsoDate,
	parseTypedDate,
	weekdayOf,
} from "./calendar";

describe("日付の計算", () => {
	it("うるう年と月の長さを、正しく数える", () => {
		expect(daysInMonth(2024, 2)).toBe(29);
		expect(daysInMonth(2026, 2)).toBe(28);
		expect(daysInMonth(2026, 4)).toBe(30);
		expect(daysInMonth(2026, 12)).toBe(31);
	});

	it("ない日付は、読まない", () => {
		expect(parseIsoDate("2026-02-30")).toBeNull();
		expect(parseIsoDate("2026-13-01")).toBeNull();
		expect(parseIsoDate("2026-2-1")).toBeNull();
		expect(parseIsoDate("2024-02-29")).toEqual({
			year: 2024,
			month: 2,
			day: 29,
		});
	});

	it("曜日は、日曜が0", () => {
		expect(weekdayOf("2026-11-01")).toBe(0);
		expect(weekdayOf("2026-10-31")).toBe(6);
	});

	it("日・月を動かす。月末は、その月の最終日にする", () => {
		expect(addDaysToDate("2026-12-31", 1)).toBe("2027-01-01");
		expect(addDaysToDate("2026-03-01", -1)).toBe("2026-02-28");
		expect(addMonthsToDate("2026-01-31", 1)).toBe("2026-02-28");
		expect(addMonthsToDate("2026-12-15", 1)).toBe("2027-01-15");
		expect(addMonthsToDate("2026-01-15", -1)).toBe("2025-12-15");
	});
});

describe("buildMonthGrid", () => {
	it("日曜始まりの6週で、前後の月の日が、週を埋める", () => {
		const grid = buildMonthGrid(2026, 11);

		expect(grid).toHaveLength(6);
		expect(grid.every((week) => week.length === 7)).toBe(true);
		// 2026年11月1日は、日曜日（先頭の日）。
		expect(grid[0][0]).toEqual({ date: "2026-11-01", day: 1, inMonth: true });
		expect(grid[5][6].date).toBe("2026-12-12");
		expect(grid[5][6].inMonth).toBe(false);
	});

	it("月の途中で始まる月は、前の月の日で、先頭の週を埋める", () => {
		const grid = buildMonthGrid(2026, 10);

		// 2026年10月1日は、木曜日。
		expect(grid[0][0]).toEqual({ date: "2026-09-27", day: 27, inMonth: false });
		expect(grid[0][4]).toEqual({ date: "2026-10-01", day: 1, inMonth: true });
	});
});

describe("表示と入力", () => {
	it("入力欄の形と、読み上げの形にする", () => {
		expect(formatDisplayDate("2026-11-02")).toBe("2026/11/02");
		expect(formatDisplayDate("")).toBe("");
		expect(describeDate("2026-11-02")).toBe("2026年11月2日 月曜日");
	});

	it("打った日付を読む（年なしは、今日の年。全角も読む）", () => {
		const today = "2026-10-31";

		expect(parseTypedDate("2026/11/2", today)).toBe("2026-11-02");
		expect(parseTypedDate("2026-11-02", today)).toBe("2026-11-02");
		expect(parseTypedDate("2026.1.5", today)).toBe("2026-01-05");
		expect(parseTypedDate("20261102", today)).toBe("2026-11-02");
		expect(parseTypedDate("11/2", today)).toBe("2026-11-02");
		expect(parseTypedDate("２０２６／１１／２", today)).toBe("2026-11-02");
	});

	it("読めないものと、ない日付は、null", () => {
		const today = "2026-10-31";

		expect(parseTypedDate("", today)).toBeNull();
		expect(parseTypedDate("あした", today)).toBeNull();
		expect(parseTypedDate("2026/2/30", today)).toBeNull();
		expect(parseTypedDate("13/1", today)).toBeNull();
	});
});
