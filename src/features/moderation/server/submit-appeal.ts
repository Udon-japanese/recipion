import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";

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

		return submitAppeal(
			{ userId, message: data.message, now: new Date() },
			{
				repository: createDrizzleAppealRepository(db),
				judge: createAppealJudge(createWorkersAiBindingRunner(env.AI)),
			},
		);
	});
