import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import * as v from "valibot";
import { hashEmailForBan } from "#/features/moderation/infrastructure/hash-email";
import {
	isAdminEmail,
	parseAdminEmails,
} from "#/integrations/cloudflare-access/access-token";
import { requireAdmin } from "#/integrations/cloudflare-access/require-admin";
import {
	adminUserSearchInputSchema,
	adminUserSearchLimit,
	liftSuspensionInputSchema,
	suspendUserInputSchema,
} from "../domain/admin-user";
import { createDrizzleAdminUserRepository } from "../infrastructure/drizzle-admin-user-repository";

// ユーザーを探す（管理者だけ。表示名・ハンドルの一部）。
export const searchAdminUsersServerFn = createServerFn({ method: "GET" })
	.validator((input) => v.parse(adminUserSearchInputSchema, input))
	.handler(async ({ data }) => {
		const { db } = await requireAdmin();

		return createDrizzleAdminUserRepository(db).search(
			data.query,
			adminUserSearchLimit,
		);
	});

// ユーザーを停止する（永久停止を含む。管理者だけ。管理者のアカウントは停止できない）。
export const suspendUserServerFn = createServerFn({ method: "POST" })
	.validator((input) => v.parse(suspendUserInputSchema, input))
	.handler(async ({ data }) => {
		const { db } = await requireAdmin();
		const adminEmails = parseAdminEmails(env.ADMIN_EMAILS);

		return createDrizzleAdminUserRepository(db).suspend({
			userId: data.userId,
			reason: data.reason,
			ban: data.ban,
			makePrivate: data.makePrivate,
			isProtectedEmail: (email) => isAdminEmail(email, adminEmails),
			hashEmail: (email) => hashEmailForBan(email, env.BETTER_AUTH_SECRET),
			now: new Date(),
		});
	});

// 停止を解除する（永久停止も解除できる。管理者だけ）。
export const liftSuspensionServerFn = createServerFn({ method: "POST" })
	.validator((input) => v.parse(liftSuspensionInputSchema, input))
	.handler(async ({ data }) => {
		const { db } = await requireAdmin();

		return createDrizzleAdminUserRepository(db).lift({
			userId: data.userId,
			hashEmail: (email) => hashEmailForBan(email, env.BETTER_AUTH_SECRET),
		});
	});
