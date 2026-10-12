import type { DB } from "#/db/client";
import {
	decideEnforcement,
	type ModerationEnforcement,
} from "../application/decide-enforcement";
import type { ModerationItem } from "../domain/moderation-target";
import { checkBeforePublish } from "./create-publish-guard";

// ユーザーが書いた、他の人に見える文章を、保存の前に審査して、保存してよいかを決める（共通の入口）。
// 欄ごとの扱い（「怪しい」を通すか断るか）は、登録簿（domain/moderation-target.ts）で決まる。
// 値が変わった欄だけを渡す（変わらない欄で、AI の枠を使わない）。
export async function enforceModeration(
	db: DB,
	userId: string,
	items: readonly ModerationItem[],
): Promise<ModerationEnforcement> {
	return decideEnforcement(await checkBeforePublish(db, { userId, items }));
}
