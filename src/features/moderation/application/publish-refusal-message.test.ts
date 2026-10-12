import { describe, expect, it } from "vitest";
import type { ModerationReason } from "../domain/moderation-result";
import {
	describeFlagReasons,
	describePublishRefusal,
} from "./publish-refusal-message";

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

	it("止めた欄だけを示す。警告の段階で、続きの文が変わる", () => {
		const first = describePublishRefusal({
			status: "rejected",
			warning: "rejected",
			reasons,
		});

		expect(first).toContain("メモ、タイトル");
		expect(first).toContain("内容を直してから");
		expect(
			describePublishRefusal({
				status: "rejected",
				warning: "warned",
				reasons,
			}),
		).toContain("今日は、公開ができなくなります");
		expect(
			describePublishRefusal({
				status: "rejected",
				warning: "locked",
				reasons,
			}),
		).toContain("これ以上、公開できません");
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
