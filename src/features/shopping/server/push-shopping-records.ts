import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { expectedUserIdSchema } from "#/integrations/better-auth/expected-user";
import { requireSession } from "#/integrations/better-auth/require-session";
import {
	parseShoppingPushRecord,
	shoppingPushRecordsSchema,
} from "../domain/shopping-sync-push";
import { createDrizzleShoppingSyncRepository } from "../infrastructure/drizzle-shopping-sync-repository";

// 端末で変えた買い物メモの行を送る。別の端末が先に変えていた行は、当てずに、サーバーの行を返す。行は、その人の端末の持ち主の印で集めたものなので、
// Cookie が別の人なら、その人のメモに書かずに断る。
export const pushShoppingRecordsServerFn = createServerFn({ method: "POST" })
	.validator((input) => {
		const { expectedUserId, records } = v.parse(
			v.object({
				expectedUserId: expectedUserIdSchema,
				records: shoppingPushRecordsSchema,
			}),
			input,
		);

		return {
			expectedUserId,
			records: records.map(parseShoppingPushRecord),
		};
	})
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession({
			expectedUserId: data.expectedUserId,
		});

		const results = await createDrizzleShoppingSyncRepository(db, userId).push(
			data.records,
		);

		return { results };
	});
