import { env } from "cloudflare:workers";

import { notifyAdminsOf } from "#/features/admin/server/notify-admins";
import type { ResolvedSession } from "#/integrations/better-auth/resolve-session";
import { createAppealJudge } from "../application/appeal-judge";
import { submitAppeal } from "../application/submit-appeal";
import { createDrizzleAppealRepository } from "../infrastructure/drizzle-appeal-repository";
import { createWorkersAiBindingRunner } from "../infrastructure/workers-ai-binding-runner";

// 停止の状態と申し立ての API（/api/v1/moderation）の中身。停止中のユーザーも使う。
export function createModerationOperations({ db, userId }: ResolvedSession) {
	const appeals = createDrizzleAppealRepository(db);

	return {
		// このアカウントの停止の状態（null は、停止されていない）。停止の画面を出すかの判断に使う。
		accountStatus: () => appeals.getSuspension(userId),

		// 停止への申し立て（停止されたユーザーだけ。何度でも出せる）。
		async submitAppeal(message: string) {
			const result = await submitAppeal(
				{ userId, message, now: new Date() },
				{
					repository: appeals,
					judge: createAppealJudge(createWorkersAiBindingRunner(env.AI)),
				},
			);

			// 新しい申し立てが入ったら、管理者に知らせる（送れなくても、申し立ては成功のまま）。
			if (result.status === "submitted") {
				await notifyAdminsOf(db, "appeal");
			}

			return result;
		},
	};
}

export type ModerationOperations = ReturnType<
	typeof createModerationOperations
>;
