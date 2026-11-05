import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { createDrizzleInventoryRepository } from "#/features/inventory/infrastructure/drizzle-inventory-repository";
import { expectedUserIdSchema } from "#/integrations/better-auth/expected-user";
import { requireSession } from "#/integrations/better-auth/require-session";

// 一覧は、端末のキャッシュ（所有者の印ごと）に入るので、画面が思っているユーザーと違えば断る。
export const listInventoryItemsServerFn = createServerFn({
	method: "GET",
})
	.validator((input) =>
		v.parse(v.object({ expectedUserId: expectedUserIdSchema }), input),
	)
	.handler(async ({ data }) => {
		const { db, userId } = await requireSession({
			expectedUserId: data.expectedUserId,
		});

		const repository = createDrizzleInventoryRepository(db, userId);

		return repository.list();
	});
