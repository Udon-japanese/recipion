import { describe, expect, it } from "vitest";
import { summarizeExpiry } from "./summarize-expiry";

const today = "2026-10-14";

function item(...lots: [number, string | null][]) {
	return {
		lots: lots.map(([quantity, expiresOn]) => ({ quantity, expiresOn })),
	};
}

describe("summarizeExpiry", () => {
	it("今日から3日以内を「近い」、今日より前を「期限切れ」に数える", () => {
		const summary = summarizeExpiry(
			[
				item([1, "2026-10-13"]), // 期限切れ
				item([1, "2026-10-14"]), // 今日（近い）
				item([1, "2026-10-17"]), // 3日後（近い）
				item([1, "2026-10-18"]), // 4日後（まだ）
				item([1, null]), // 期限なし
			],
			today,
		);

		expect(summary).toEqual({ soon: 3, expired: 1 });
	});

	it("1つの食材に複数のロットがあっても、1件として数える", () => {
		const summary = summarizeExpiry(
			[item([1, "2026-10-12"], [2, "2026-10-13"], [1, "2026-10-15"])],
			today,
		);

		expect(summary).toEqual({ soon: 1, expired: 1 });
	});

	it("数量が 0 のロットは数えない", () => {
		expect(summarizeExpiry([item([0, "2026-10-01"])], today)).toEqual({
			soon: 0,
			expired: 0,
		});
	});

	it("月をまたいでも数えられる", () => {
		expect(summarizeExpiry([item([1, "2026-11-01"])], "2026-10-30")).toEqual({
			soon: 1,
			expired: 0,
		});
	});
});
