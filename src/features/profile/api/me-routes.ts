import { type Context, Hono } from "hono";
import * as v from "valibot";

import type { ResolveSession } from "#/api/middleware/session";
import { validate } from "#/api/validate";
import { avatarSchema } from "#/features/avatar/domain/avatar";
import type { ResolvedSession } from "#/integrations/better-auth/resolve-session";
import type { MeOperations } from "./me-operations";

export type MeRouteDependencies = {
	resolveSession: ResolveSession;
	createOperations: (session: ResolvedSession) => MeOperations;
};

// 長すぎる入力は、検証の前に断る（中身の検証は、updateProfile が行う）。
const updateProfileInputSchema = v.object({
	name: v.pipe(v.string(), v.maxLength(200)),
	handle: v.pipe(v.string(), v.maxLength(100)),
});

// null は、作ったアバターを消して、ユーザーごとに決まったプリセットに戻す。
const updateAvatarInputSchema = v.object({
	avatar: v.nullable(avatarSchema),
});

// ログインしている本人の API（/api/v1/me）。
export function createMeRoutes(dependencies: MeRouteDependencies) {
	async function operationsFor(c: Context) {
		return dependencies.createOperations(
			await dependencies.resolveSession(c.req.raw.headers),
		);
	}

	return new Hono()
		.get("/profile", async (c) =>
			c.json(await (await operationsFor(c)).getProfile(), 200),
		)
		.post("/profile", validate("json", updateProfileInputSchema), async (c) =>
			c.json(
				await (await operationsFor(c)).updateProfile(c.req.valid("json")),
				200,
			),
		)
		.post("/avatar", validate("json", updateAvatarInputSchema), async (c) =>
			c.json(
				await (await operationsFor(c)).updateAvatar(c.req.valid("json").avatar),
				200,
			),
		);
}
