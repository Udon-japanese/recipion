import { createServerFn } from "@tanstack/react-start";
import { requireSession } from "#/integrations/better-auth/require-session";
import { createDrizzleAppealRepository } from "../infrastructure/drizzle-appeal-repository";

// このアカウントの停止の状態（null は、停止されていない）。停止の画面を出すかの判断に使う。
export const getAccountStatusServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const { db, userId } = await requireSession({ allowSuspended: true });

	return createDrizzleAppealRepository(db).getSuspension(userId);
});
