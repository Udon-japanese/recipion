import { describe, expect, it } from "vitest";
import {
	describeRecipeDates,
	formatCookDate,
	formatRecipeCookCursor,
	groupRecipeCooksByDate,
	parseRecipeCookCursor,
	type RecipeCookEntry,
} from "./recipe-cook-log";

function entry(id: string, cookedAt: string): RecipeCookEntry {
	return {
		id,
		cookedAt,
		recipeName: id,
		publicId: id,
		cover: null,
		yieldText: "2人分",
		author: null,
	};
}

describe("groupRecipeCooksByDate", () => {
	it("日本時間の日付ごとに、順番を保ってまとめる（UTC の15時が、日付の境目）", () => {
		const days = groupRecipeCooksByDate([
			entry("a", "2026-11-05T15:00:00.000Z"),
			entry("b", "2026-11-05T14:59:59.000Z"),
			entry("c", "2026-11-05T01:00:00.000Z"),
			entry("d", "2026-11-03T10:00:00.000Z"),
		]);

		expect(
			days.map((day) => [day.date, day.entries.map((item) => item.id)]),
		).toEqual([
			["2026-11-06", ["a"]],
			["2026-11-05", ["b", "c"]],
			["2026-11-03", ["d"]],
		]);
	});
});

describe("formatCookDate", () => {
	it.each([
		["2026-11-05", "2026年11月5日（木）"],
		["2026-01-01", "2026年1月1日（木）"],
		["2027-02-28", "2027年2月28日（日）"],
	])("%s は %s", (date, expected) => {
		expect(formatCookDate(date)).toBe(expected);
	});
});

describe("describeRecipeDates", () => {
	it.each([
		{
			title: "非公開は登録日。同じ日の保存し直しでは、更新を出さない",
			dates: {
				createdAt: "2026-11-01T01:00:00.000Z",
				publishedAt: null,
				updatedAt: "2026-11-01T14:00:00.000Z",
			},
			expected: [{ label: "登録", date: "2026年11月1日" }],
		},
		{
			title: "非公開で、後の日に保存し直したら、更新も出す",
			dates: {
				createdAt: "2026-11-01T01:00:00.000Z",
				publishedAt: null,
				updatedAt: "2026-11-01T15:00:00.000Z",
			},
			expected: [
				{ label: "登録", date: "2026年11月1日" },
				{ label: "更新", date: "2026年11月2日" },
			],
		},
		{
			title: "公開したレシピは公開日。公開する前の直しは、更新に数えない",
			dates: {
				createdAt: "2026-10-01T01:00:00.000Z",
				publishedAt: "2026-11-03T01:00:00.000Z",
				updatedAt: "2026-11-03T01:00:00.000Z",
			},
			expected: [{ label: "公開", date: "2026年11月3日" }],
		},
		{
			title: "公開したあとの日に直したら、更新も出す",
			dates: {
				createdAt: "2026-10-01T01:00:00.000Z",
				publishedAt: "2026-11-03T01:00:00.000Z",
				updatedAt: "2026-11-05T01:00:00.000Z",
			},
			expected: [
				{ label: "公開", date: "2026年11月3日" },
				{ label: "更新", date: "2026年11月5日" },
			],
		},
	])("$title", ({ dates, expected }) => {
		expect(describeRecipeDates(dates)).toEqual(expected);
	});
});

describe("parseRecipeCookCursor", () => {
	it("データベースが返した日時の文字と ID を、そのまま往復させる", () => {
		const cursor = {
			cookedAt: "2026-11-05 10:00:00.123456+00",
			id: "0b6a2c4e-1f3d-4a5b-8c7d-9e0f1a2b3c4d",
		};

		expect(parseRecipeCookCursor(formatRecipeCookCursor(cursor))).toEqual(
			cursor,
		);
	});

	it.each([
		"",
		"2026-11-05|0b6a2c4e-1f3d-4a5b-8c7d-9e0f1a2b3c4d",
		"2026-11-05 10:00:00+00|not-a-uuid",
		"2026-11-05 10:00:00+00|0b6a2c4e-1f3d-4a5b-8c7d-9e0f1a2b3c4d'--",
	])("形の違う文字（%s）は受け付けない", (value) => {
		expect(parseRecipeCookCursor(value)).toBeNull();
	});
});
