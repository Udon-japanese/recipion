import { maxJudgedAppealsPerDay } from "../domain/appeal";
import { toJstDate } from "../domain/violation-policy";
import type { AppealJudge } from "./appeal-judge";
import type { AppealRepository, SubmitAppealResult } from "./appeal-repository";

// 停止されたユーザーの申し立て。何度でも出せる。AI の判定は、1日に決まった数まで（超えた分は、判定せずに、管理者へ）。
export async function submitAppeal(
	input: { userId: string; message: string; now: Date },
	{ repository, judge }: { repository: AppealRepository; judge: AppealJudge },
): Promise<SubmitAppealResult> {
	if ((await repository.getSuspension(input.userId)) !== "suspended") {
		return { status: "not-allowed" };
	}

	const dayStart = new Date(`${toJstDate(input.now)}T00:00:00+09:00`);
	const todayCount = await repository.countAppealsSince(input.userId, dayStart);
	let verdict: Awaited<ReturnType<AppealJudge>> | "not-judged" = "not-judged";

	if (todayCount < maxJudgedAppealsPerDay) {
		try {
			verdict = await judge(input.message);
		} catch {
			// AI が使えなくても、申し立ては受け付ける（管理者が読む）。
			verdict = "not-judged";
		}
	}

	await repository.create({
		userId: input.userId,
		message: input.message,
		verdict,
		now: input.now,
	});

	return { status: "submitted", verdict };
}
