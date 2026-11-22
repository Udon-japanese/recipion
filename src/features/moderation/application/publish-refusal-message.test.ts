import { describe, expect, it } from "vitest";
import type { ModerationReason } from "../domain/moderation-result";
import type { ModerationItem } from "../domain/moderation-target";
import {
	describeFlagReasons,
	describeFlagRefusal,
	describePublishRefusal,
} from "./publish-refusal-message";

const items: ModerationItem[] = [
	{ target: "recipe-title", text: "ふつうのカレー" },
	{ target: "recipe-instruction", text: "玉ねぎを切る" },
	{ target: "recipe-instruction", text: "1行目\nここがだめ\n3行目" },
	{ target: "recipe-note", text: "メモ" },
];

const reasons: ModerationReason[] = [
	{ target: "recipe-note", source: "ai", category: "sexual" },
	{ target: "recipe-note", source: "lexicon", category: "sexual" },
	{ target: "recipe-title", source: "ai", category: "harassment" },
];

describe("describePublishRefusal", () => {
	it("公開してよいときは null", () => {
		expect(describePublishRefusal({ status: "ok" })).toBeNull();
		expect(describePublishRefusal({ status: "flagged", reasons })).toBeNull();
	});

	it("警告の段階で、続きの文が変わる", () => {
		const first = describePublishRefusal({
			status: "rejected",
			warning: "rejected",
			reasons,
		});

		expect(first).toContain("内容を直してから");
		expect(
			describePublishRefusal({
				status: "rejected",
				warning: "warned",
				reasons,
			}),
		).toContain("今日は公開ができなくなります");
		expect(
			describePublishRefusal({
				status: "rejected",
				warning: "locked",
				reasons,
			}),
		).toContain("これ以上公開できません");
		expect(
			describePublishRefusal({
				status: "rejected",
				warning: "suspended",
				reasons,
			}),
		).toContain("アカウントを停止しました");
	});

	it.each([
		["suspended", "停止"],
		["locked-today", "0時"],
		["ai-limit", "上限"],
		["unavailable", "時間をおいて"],
	] as const)("%s", (status, text) => {
		expect(describePublishRefusal({ status })).toContain(text);
	});
});

describe("describeFlagReasons", () => {
	it("欄と種類を、重複なく並べる", () => {
		expect(describeFlagReasons(reasons)).toBe(
			"メモ（性的な内容）、タイトル（侮辱・嫌がらせ）",
		);
	});
});

describe("当たった場所（利用者が書いた、その行）", () => {
	it.each([
		[
			"同じ欄が複数あれば何番目か。当たった行だけを出す",
			[
				{
					target: "recipe-instruction",
					source: "ai",
					category: "sexual",
					location: { item: 2, start: 4, end: 9 },
				},
			],
			"・作り方の2番目「ここがだめ」（性的な内容）",
		],
		[
			"1つだけの欄は、番号を付けない。範囲がなければ、その文章",
			[
				{
					target: "recipe-title",
					source: "ai",
					category: "spam",
					location: { item: 0 },
				},
			],
			"・タイトル「ふつうのカレー」（勧誘・広告）",
		],
		[
			"同じ場所の、別の種類は、1行にまとめる",
			[
				{
					target: "recipe-note",
					source: "ai",
					category: "spam",
					location: { item: 3 },
				},
				{
					target: "recipe-note",
					source: "lexicon",
					category: "sexual",
					location: { item: 3 },
				},
			],
			"・メモ「メモ」（勧誘・広告、性的な内容）",
		],
		[
			"場所が分からなければ、欄と種類だけ",
			[{ target: "recipe-note", source: "ai", category: "spam" }],
			"・メモ（勧誘・広告）",
		],
	] as const)("%s", (_label, placeReasons, expected) => {
		const message = describePublishRefusal(
			{ status: "rejected", warning: "rejected", reasons: [...placeReasons] },
			items,
		);

		expect(message?.split("\n").slice(1)).toEqual([expected]);
	});

	it("4か所以上は、3か所まで出して、残りを数でまとめる", () => {
		const many: ModerationReason[] = [0, 1, 2, 3].map((item) => ({
			target: items[item]?.target ?? "recipe-note",
			source: "ai",
			category: "other",
			location: { item },
		}));
		const lines = describeFlagRefusal(many, items).split("\n");

		expect(lines).toHaveLength(5);
		expect(lines[4]).toBe("・ほか1か所");
	});

	it("管理者の画面には、何番目かと種類だけ（文章は載せない）", () => {
		expect(
			describeFlagReasons(
				[
					{
						target: "recipe-instruction",
						source: "ai",
						category: "sexual",
						location: { item: 2 },
					},
				],
				items,
			),
		).toBe("作り方の2番目（性的な内容）");
	});
});
