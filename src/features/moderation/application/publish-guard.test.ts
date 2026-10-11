import { describe, expect, it, vi } from "vitest";
import type { AiJudge, AiVerdict } from "./ai-judge";
import type { ModerationLexicons } from "./moderate-content";
import type {
	AccountSuspensionStatus,
	CachedDecision,
	ModerationRepository,
} from "./moderation-repository";
import { guardPublish, maxAiChecksPerDay } from "./publish-guard";

const ok: AiVerdict = { verdict: "ok", category: "other" };
const ng: AiVerdict = { verdict: "ng", category: "sexual" };

const lexicons: ModerationLexicons = {
	hard: [{ category: "violence", terms: ["ぴよぴよ"] }],
	hardEmoji: [],
	context: [],
	hintEmoji: [],
	innocentPhrases: [],
};

const jst = (date: string, time: string) =>
	new Date(`${date}T${time}:00+09:00`);

function createFakeRepository(initial?: {
	suspension?: AccountSuspensionStatus;
	violations?: Date[];
	aiChecks?: number;
}) {
	const violations = [...(initial?.violations ?? [])];
	const cache = new Map<string, CachedDecision>();
	let suspension = initial?.suspension ?? null;
	let aiChecks = initial?.aiChecks ?? 0;

	const repository: ModerationRepository = {
		getSuspension: async () => suspension,
		suspend: async () => {
			suspension = "suspended";
		},
		listViolationTimes: async () => [...violations],
		recordViolation: async ({ now }) => {
			violations.push(now);
		},
		getCached: async (hash) => cache.get(hash) ?? null,
		putCached: async ({ contentHash, decision }) => {
			cache.set(contentHash, decision);
			aiChecks += 1;
		},
		countAiChecksSince: async () => aiChecks,
	};

	return {
		repository,
		violations,
		cache,
		getSuspension: () => suspension,
	};
}

function judgeReturning(...verdicts: AiVerdict[]): AiJudge {
	return vi.fn(async () => verdicts);
}

const items = [{ target: "recipe-note" as const, text: "あれ" }];
const now = jst("2026-10-11", "12:00");

describe("guardPublish", () => {
	it("問題なければ ok。同じ内容の2回目は、AI に聞かない", async () => {
		const fake = createFakeRepository();
		const judge = judgeReturning(ok);

		expect(
			await guardPublish(
				{ userId: "u", items, now },
				{ repository: fake.repository, judge, lexicons },
			),
		).toEqual({ status: "ok" });
		expect(
			await guardPublish(
				{ userId: "u", items, now },
				{ repository: fake.repository, judge, lexicons },
			),
		).toEqual({ status: "ok" });
		expect(judge).toHaveBeenCalledTimes(1);
	});

	it("停止中は、何も判定せず suspended", async () => {
		const fake = createFakeRepository({ suspension: "suspended" });
		const judge = judgeReturning(ok);

		expect(
			await guardPublish(
				{ userId: "u", items, now },
				{ repository: fake.repository, judge, lexicons },
			),
		).toEqual({ status: "suspended" });
		expect(judge).not.toHaveBeenCalled();
	});

	it("block の1回目は断る、2回目は警告、3回目はその日の停止。4回目は判定せず locked-today", async () => {
		const fake = createFakeRepository();
		const judge = judgeReturning(ng);
		const deps = { repository: fake.repository, judge, lexicons };
		const texts = ["あ", "い", "う", "え"];
		const results = [];

		for (const [index, text] of texts.entries()) {
			results.push(
				await guardPublish(
					{
						userId: "u",
						items: [{ target: "recipe-note", text }],
						now: jst("2026-10-11", `1${index}:00`),
					},
					deps,
				),
			);
		}

		expect(results.map((result) => result.status)).toEqual([
			"rejected",
			"rejected",
			"rejected",
			"locked-today",
		]);
		expect(
			results.map((result) =>
				result.status === "rejected" ? result.warning : null,
			),
		).toEqual(["rejected", "warned", "locked", null]);
		expect(fake.violations).toHaveLength(3);
		expect(judge).toHaveBeenCalledTimes(3);
	});

	it("確定の語で止めた場合も、違反に数える（AI は使わない）", async () => {
		const fake = createFakeRepository();
		const judge = judgeReturning(ok);
		const result = await guardPublish(
			{
				userId: "u",
				items: [{ target: "recipe-note", text: "ぴよぴよ" }],
				now,
			},
			{ repository: fake.repository, judge, lexicons },
		);

		expect(result).toMatchObject({ status: "rejected", warning: "rejected" });
		expect(judge).not.toHaveBeenCalled();
		expect(fake.violations).toHaveLength(1);
		expect(fake.cache.size).toBe(0);
	});

	it("同じ内容で、キャッシュに block があっても、再び違反に数える", async () => {
		const fake = createFakeRepository();
		const judge = judgeReturning(ng);
		const deps = { repository: fake.repository, judge, lexicons };

		await guardPublish({ userId: "u", items, now }, deps);
		await guardPublish(
			{ userId: "u", items, now: jst("2026-10-11", "13:00") },
			deps,
		);

		expect(judge).toHaveBeenCalledTimes(1);
		expect(fake.violations).toHaveLength(2);
	});

	it("前回の3回目から7日以内に、また3回に至れば、アカウントを停止する", async () => {
		const fake = createFakeRepository({
			violations: [
				jst("2026-10-11", "09:00"),
				jst("2026-10-11", "10:00"),
				jst("2026-10-11", "11:00"),
				jst("2026-10-15", "09:00"),
				jst("2026-10-15", "10:00"),
			],
		});
		const result = await guardPublish(
			{ userId: "u", items, now: jst("2026-10-15", "11:00") },
			{ repository: fake.repository, judge: judgeReturning(ng), lexicons },
		);

		expect(result).toMatchObject({ status: "rejected", warning: "suspended" });
		expect(fake.getSuspension()).toBe("suspended");
	});

	it("flag は通す（理由つき）。違反には数えない", async () => {
		const fake = createFakeRepository();
		const result = await guardPublish(
			{ userId: "u", items, now },
			{
				repository: fake.repository,
				judge: judgeReturning({ verdict: "unsure", category: "other" }),
				lexicons,
			},
		);

		expect(result).toMatchObject({ status: "flagged" });
		expect(fake.violations).toHaveLength(0);
	});

	it("今日の AI 判定の上限を超えたら ai-limit。ただし、確定の語は、止める", async () => {
		const fake = createFakeRepository({ aiChecks: maxAiChecksPerDay });
		const judge = judgeReturning(ok);
		const deps = { repository: fake.repository, judge, lexicons };

		expect(await guardPublish({ userId: "u", items, now }, deps)).toEqual({
			status: "ai-limit",
		});
		expect(
			await guardPublish(
				{
					userId: "u",
					items: [{ target: "recipe-note", text: "ぴよぴよ" }],
					now,
				},
				deps,
			),
		).toMatchObject({ status: "rejected" });
		expect(judge).not.toHaveBeenCalled();
	});

	it("AI が失敗したら unavailable。覚えない・違反にも数えない", async () => {
		const fake = createFakeRepository();
		const result = await guardPublish(
			{ userId: "u", items, now },
			{
				repository: fake.repository,
				judge: async () => {
					throw new Error("障害");
				},
				lexicons,
			},
		);

		expect(result).toEqual({ status: "unavailable" });
		expect(fake.cache.size).toBe(0);
		expect(fake.violations).toHaveLength(0);
	});
});
