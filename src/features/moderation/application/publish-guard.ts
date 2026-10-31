import { hashModerationItems } from "../domain/content-hash";
import type {
	ModerationCategory,
	ModerationReason,
} from "../domain/moderation-result";
import type { ModerationItem } from "../domain/moderation-target";
import {
	evaluateViolations,
	isLockedToday,
	toJstDate,
	type ViolationOutcome,
	violationLookbackStart,
} from "../domain/violation-policy";
import type { AiJudge } from "./ai-judge";
import { type ModerationLexicons, moderateContent } from "./moderate-content";
import type { ModerationRepository } from "./moderation-repository";

// 1人が、1日に、AI で判定してよい回数（同じ内容は、数えない）。無料枠を、使い切られないための上限。
export const maxAiChecksPerDay = 20;

export type PublishGuardResult =
	// 問題なし。公開してよい。
	| { status: "ok" }
	// 怪しい。公開は通し、管理者の画面に、自動検知として載せる。
	| { status: "flagged"; reasons: ModerationReason[] }
	// 公開できない内容。回数に数えた。warning は、利用者に見せる警告の段階。
	| {
			status: "rejected";
			warning: ViolationOutcome;
			// 理由は、欄と種類だけ（語は返さない）。
			reasons: ModerationReason[];
	  }
	// 今日は、違反が上限に達していて、公開できない（日本時間の 0 時まで）。
	| { status: "locked-today" }
	// アカウントが停止されている。
	| { status: "suspended" }
	// 今日の AI 判定の上限を超えた。
	| { status: "ai-limit" }
	// AI が使えず、判定できなかった。
	| { status: "unavailable" };

export type PublishGuardDeps = {
	repository: ModerationRepository;
	judge: AiJudge;
	lexicons?: ModerationLexicons;
};

/**
 * 公開しようとする文章の審査（公開の前に呼ぶ）。
 * 停止中・今日の上限 → 判定の記録（同じ内容は、AI に聞かない）→ 違反の数え方に反映。
 */
export async function guardPublish(
	input: { userId: string; items: readonly ModerationItem[]; now: Date },
	{ repository, judge, lexicons }: PublishGuardDeps,
): Promise<PublishGuardResult> {
	const { userId, items, now } = input;

	if ((await repository.getSuspension(userId)) !== null) {
		return { status: "suspended" };
	}

	const violationTimes = await repository.listViolationTimes(
		userId,
		violationLookbackStart(now),
	);

	if (isLockedToday(violationTimes, now)) {
		return { status: "locked-today" };
	}

	const contentHash = await hashModerationItems(items);
	const cached = await repository.getCached(contentHash);
	let usedAi = false;
	let result: Awaited<ReturnType<typeof moderateContent>>;

	if (cached) {
		result =
			cached.decision === "allow"
				? { decision: "allow" }
				: { decision: cached.decision, reasons: cached.reasons };
	} else {
		const dayStart = new Date(`${toJstDate(now)}T00:00:00+09:00`);

		if (
			(await repository.countAiChecksSince(userId, dayStart)) >=
			maxAiChecksPerDay
		) {
			// 確定の語は、AI を使わずに止められるので、先に確かめる（上限を理由に、悪い内容を通さない）。
			const lexiconOnly = await moderateContent(
				items,
				async () => {
					throw new Error("AI の上限");
				},
				lexicons,
			);

			if (lexiconOnly.decision !== "block") {
				return { status: "ai-limit" };
			}

			result = lexiconOnly;
		} else {
			result = await moderateContent(
				items,
				async (judgeItems) => {
					usedAi = true;

					return judge(judgeItems);
				},
				lexicons,
			);
		}
	}

	if (result.decision === "unavailable") {
		return { status: "unavailable" };
	}

	// AI を使った結果だけ覚える（確定の語で止めたものは、毎回その場で判定できる）。
	if (usedAi && !cached) {
		await repository.putCached({
			contentHash,
			userId,
			decision:
				result.decision === "allow"
					? { decision: "allow", reasons: [] }
					: { decision: result.decision, reasons: result.reasons },
			now,
		});
	}

	if (result.decision === "allow") {
		return { status: "ok" };
	}

	if (result.decision === "flag") {
		return { status: "flagged", reasons: result.reasons };
	}

	await repository.recordViolation({
		userId,
		now,
		categories: result.reasons.map(
			(reason): ModerationCategory => reason.category,
		),
	});

	const warning = evaluateViolations([...violationTimes, now], now);

	if (warning === "suspended") {
		await repository.suspend({
			userId,
			reason: "公開できない内容を繰り返し投稿しようとしたため",
			now,
		});
	}

	return { status: "rejected", warning, reasons: result.reasons };
}
