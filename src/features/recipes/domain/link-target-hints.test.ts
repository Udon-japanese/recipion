import { describe, expect, it } from "vitest";
import {
	buildLinkTargetHints,
	formatLinkTargetLabel,
} from "./link-target-hints";
import type { RecipeLinkTarget } from "./recipe-links";

// 日本時間の日時から、ISO 8601 を作る（日本時間は、UTC より9時間早い）。
function target(publicId: string, name: string, jst: string): RecipeLinkTarget {
	return { publicId, name, createdAt: `${jst}+09:00` };
}

describe("buildLinkTargetHints", () => {
	it("名前が重ならなければ、見分けの表示は付けない", () => {
		const hints = buildLinkTargetHints([
			target("a", "カレー", "2026-10-09T10:00:00"),
			target("b", "ハンバーグ", "2026-10-09T10:00:00"),
		]);

		expect(hints.size).toBe(0);
	});

	it("同じ名前のレシピには、登録日（日本時間）を付ける", () => {
		const hints = buildLinkTargetHints([
			target("a", "カレー", "2026-10-09T10:00:00"),
			target("b", "カレー", "2026-10-11T23:30:00"),
			target("c", "ハンバーグ", "2026-10-09T10:00:00"),
		]);

		expect(hints.get("a")).toBe("10/9 登録");
		expect(hints.get("b")).toBe("10/11 登録");
		expect(hints.has("c")).toBe(false);
	});

	it("日本時間で数える（UTC では前の日でも、日本の日付で出す）", () => {
		const hints = buildLinkTargetHints([
			{ publicId: "a", name: "カレー", createdAt: "2026-10-08T16:30:00Z" },
			{ publicId: "b", name: "カレー", createdAt: "2026-10-09T02:00:00Z" },
		]);

		// 16:30 UTC は、日本では 10/9 の 01:30。02:00 UTC は、日本では 10/9 の 11:00（同じ日）。
		expect(hints.get("a")).toBe("10/9 01:30 登録");
		expect(hints.get("b")).toBe("10/9 11:00 登録");
	});

	it("同じ名前で、同じ日に登録したものは、時刻まで付ける", () => {
		const hints = buildLinkTargetHints([
			target("a", "カレー", "2026-10-09T10:05:00"),
			target("b", "カレー", "2026-10-09T18:40:00"),
			target("c", "カレー", "2026-10-10T08:00:00"),
		]);

		expect(hints.get("a")).toBe("10/9 10:05 登録");
		expect(hints.get("b")).toBe("10/9 18:40 登録");
		expect(hints.get("c")).toBe("10/10 登録");
	});

	it("時刻（分）まで同じなら、登録の順に番号を付ける", () => {
		const hints = buildLinkTargetHints([
			target("a", "カレー", "2026-10-09T10:05:30"),
			target("b", "カレー", "2026-10-09T10:05:10"),
		]);

		expect(hints.get("b")).toBe("10/9 10:05 登録（1つ目）");
		expect(hints.get("a")).toBe("10/9 10:05 登録（2つ目）");
	});

	it("名前の前後の空白は、無視して、同じ名前とみなす", () => {
		const hints = buildLinkTargetHints([
			target("a", "カレー ", "2026-10-09T10:00:00"),
			target("b", "カレー", "2026-10-10T10:00:00"),
		]);

		expect(hints.size).toBe(2);
	});
});

describe("formatLinkTargetLabel", () => {
	it("見分けが必要なときだけ、登録日を添える", () => {
		const hints = new Map([["a", "10/9 登録"]]);

		expect(
			formatLinkTargetLabel(
				target("a", "カレー", "2026-10-09T10:00:00"),
				hints,
			),
		).toBe("カレー ・ 10/9 登録");
		expect(
			formatLinkTargetLabel(
				target("z", "ハンバーグ", "2026-10-09T10:00:00"),
				hints,
			),
		).toBe("ハンバーグ");
	});
});
