import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";

import { requireAdmin } from "#/integrations/cloudflare-access/require-admin";
import { resolveAppealInputSchema } from "../domain/appeal";
import { createDrizzleAppealRepository } from "../infrastructure/drizzle-appeal-repository";
import { hashEmailForBan } from "../infrastructure/hash-email";

// 未対応の申し立ての一覧（管理者だけ）。
export const listOpenAppealsServerFn = createServerFn({
	method: "GET",
}).handler(async () => {
	const { db } = await requireAdmin();

	return createDrizzleAppealRepository(db).listOpen();
});

// 申し立てへの対応（停止の解除・永久停止・退ける。管理者だけ）。
export const resolveAppealServerFn = createServerFn({ method: "POST" })
	.validator((input) => v.parse(resolveAppealInputSchema, input))
	.handler(async ({ data }) => {
		const { db } = await requireAdmin();

		return createDrizzleAppealRepository(db).resolve({
			appealId: data.appealId,
			action: data.action,
			hashEmail: (email) => hashEmailForBan(email, env.BETTER_AUTH_SECRET),
			now: new Date(),
		});
	});
