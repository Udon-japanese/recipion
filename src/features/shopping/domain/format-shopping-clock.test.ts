import { describe, expect, it } from "vitest";
import { formatShoppingClock } from "./format-shopping-clock";

describe("formatShoppingClock（買い物メモの、いまの日時）", () => {
	it.each([
		// 月日は1桁のまま、時は0を付けず、分は2桁
		["2026-01-05T09:05:00+09:00", "1/5（月）9:05"],
		["2026-11-12T20:30:59+09:00", "11/12（木）20:30"],
		// 日付が変わる前後（0時は 0、曜日も変わる）
		["2026-11-12T23:59:00+09:00", "11/12（木）23:59"],
		["2026-11-13T00:00:00+09:00", "11/13（金）0:00"],
	])("%s → %s", (iso, expected) => {
		expect(formatShoppingClock(new Date(iso), "Asia/Tokyo")).toBe(expected);
	});
});
