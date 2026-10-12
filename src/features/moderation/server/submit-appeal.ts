import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";

import { notifyAdminsOf } from "#/features/admin/server/notify-admins";
import { requireSession } from "#/integrations/better-auth/require-session";
import { createAppealJudge } from "../application/appeal-judge";
import { submitAppeal } from "../application/submit-appeal";
import { appealInputSchema } from "../domain/appeal";
import { createDrizzleAppealRepository } from "../infrastructure/drizzle-appeal-repository";
import { createWorkersAiBindingRunner } from "../infrastructure/workers-ai-binding-runner";

// 停止への申し立て（停止されたユーザーだけ。何度でも出せる）。
export const submitAppealServerFn = createServerFn({ method: "POST" })
	.validator((input) => v.parse(appealInputSchema, input))
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession({ allowSuspended: true });

		const result = await submitAppeal(
			{ userId, message: data.message, now: new Date() },
			{
				repository: createDrizzleAppealRepository(db),
				judge: createAppealJudge(createWorkersAiBindingRunner(env.AI)),
			},
		);

		// 新しい申し立てが入ったら、管理者に知らせる（送れなくても、申し立ては成功のまま）。
		if (result.status === "submitted") {
			await notifyAdminsOf(db, "appeal");
		}

		return result;
	});
