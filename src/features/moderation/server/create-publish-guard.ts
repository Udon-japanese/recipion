import { env } from "cloudflare:workers";

import type { DB } from "#/db/client";
import { createAiJudge } from "../application/ai-judge";
import {
	guardPublish,
	type PublishGuardResult,
} from "../application/publish-guard";
import type { ModerationItem } from "../domain/moderation-target";
import { createDrizzleModerationRepository } from "../infrastructure/drizzle-moderation-repository";
import { createWorkersAiBindingRunner } from "../infrastructure/workers-ai-binding-runner";

// 公開しようとする文章の審査（公開の前に、サーバー関数の中で呼ぶ）。
// block のときは、違反に数える。停止中・今日の上限・AI の上限・AI の障害のときは、公開を止める。
export function checkBeforePublish(
	db: DB,
	input: { userId: string; items: readonly ModerationItem[] },
): Promise<PublishGuardResult> {
	return guardPublish(
		{ ...input, now: new Date() },
		{
			repository: createDrizzleModerationRepository(db),
			judge: createAiJudge(createWorkersAiBindingRunner(env.AI)),
		},
	);
}
