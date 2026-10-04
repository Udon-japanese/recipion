import { describe, expect, it } from "vitest";
import { formatDateWithWeekday, formatShortDate } from "./expiry-labels";

describe("expiry-labels", () => {
	it("日付を、月/日で表示する（0を付けない）", () => {
		expect(formatShortDate("2026-10-05")).toBe("10/5");
		expect(formatShortDate("2026-12-31")).toBe("12/31");
	});

	it("曜日つきで表示する", () => {
		expect(formatDateWithWeekday("2026-10-05")).toBe("10/5（月）");
		expect(formatDateWithWeekday("2026-10-04")).toBe("10/4（日）");
		expect(formatDateWithWeekday("2026-10-10")).toBe("10/10（土）");
	});
});
