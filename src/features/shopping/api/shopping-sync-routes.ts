import { Hono } from "hono";
import * as v from "valibot";

import type { ResolveSession } from "#/api/middleware/session";
import { validate } from "#/api/validate";
import { UserFacingError } from "#/errors/user-facing-error";
import { expectedUserIdSchema } from "#/integrations/better-auth/expected-user";
import type { ResolvedSession } from "#/integrations/better-auth/resolve-session";
import {
	type ShoppingPushRecord,
	type ShoppingPushResult,
	shoppingPushRecordsSchema,
	type VersionedShoppingRecord,
} from "../domain/shopping-sync-push";
import {
	assertShoppingRecordId,
	shoppingSyncLimits,
} from "../domain/shopping-sync-record";

// 同期の行を読み書きする先（本番は Drizzle の repository。テストで差し替える）。
export type ShoppingSyncStore = {
	push(records: readonly ShoppingPushRecord[]): Promise<ShoppingPushResult[]>;
	pull(
		after: number,
		limit: number,
	): Promise<{
		records: VersionedShoppingRecord[];
		cursor: number;
		hasMore: boolean;
	}>;
};

export type ShoppingSyncRouteDependencies = {
	resolveSession: ResolveSession;
	createStore: (session: ResolvedSession) => ShoppingSyncStore;
};

const pushBodySchema = v.object({
	// 画面が思っているユーザー。セッションのユーザーと違えば断る（行は、その人の端末の持ち主の印で集めたもの）。
	expectedUserId: v.optional(expectedUserIdSchema),
	records: shoppingPushRecordsSchema,
});

const pullQuerySchema = v.object({
	expectedUserId: v.optional(expectedUserIdSchema),
	// 受け取り済みの版（0 以上の整数）。
	after: v.pipe(v.string(), v.regex(/^\d{1,15}$/u), v.transform(Number)),
});

const MISMATCHED_ID_MESSAGE = "同期する行の ID が、中身と合いません";

// 買い物メモの同期（/api/v1/shopping/sync）。
export function createShoppingSyncRoutes(
	dependencies: ShoppingSyncRouteDependencies,
) {
	return (
		new Hono()
			// 端末で変えた行を送る。別の端末が先に変えていた行は、当てずに、サーバーの行を返す。
			.post("/push", validate("json", pushBodySchema), async (c) => {
				const { expectedUserId, records } = c.req.valid("json");

				for (const record of records) {
					try {
						assertShoppingRecordId(record);
					} catch {
						throw new UserFacingError(MISMATCHED_ID_MESSAGE, {
							code: "INVALID_INPUT",
						});
					}
				}

				const session = await dependencies.resolveSession(c.req.raw.headers, {
					expectedUserId,
				});
				const results = await dependencies.createStore(session).push(records);

				return c.json({ results }, 200);
			})
			// 受け取り済みの版より新しい行。
			.get("/pull", validate("query", pullQuerySchema), async (c) => {
				const { expectedUserId, after } = c.req.valid("query");
				const session = await dependencies.resolveSession(c.req.raw.headers, {
					expectedUserId,
				});
				const page = await dependencies
					.createStore(session)
					.pull(after, shoppingSyncLimits.pullPageSize);

				return c.json(page, 200);
			})
	);
}
