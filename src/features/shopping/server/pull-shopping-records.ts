import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { expectedUserIdSchema } from "#/integrations/better-auth/expected-user";
import { requireSession } from "#/integrations/better-auth/require-session";
import { shoppingSyncLimits } from "../domain/shopping-sync-record";
import { createDrizzleShoppingSyncRepository } from "../infrastructure/drizzle-shopping-sync-repository";

// 受け取り済みの版より新しい、買い物メモの行。端末のその人のメモに入るので、画面が思っているユーザーと違えば断る。
export const pullShoppingRecordsServerFn = createServerFn({ method: "GET" })
	.validator((input) =>
		v.parse(
			v.object({
				expectedUserId: expectedUserIdSchema,
				after: v.pipe(v.number(), v.integer(), v.minValue(0)),
			}),
			input,
		),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession({
			expectedUserId: data.expectedUserId,
		});

		return createDrizzleShoppingSyncRepository(db, userId).pull(
			data.after,
			shoppingSyncLimits.pullPageSize,
		);
	});
