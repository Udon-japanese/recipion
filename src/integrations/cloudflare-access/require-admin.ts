import { env } from "cloudflare:workers";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createRemoteJWKSet, type JWTVerifyGetKey } from "jose";

import { createDb } from "#/db/client";
import { UserFacingError } from "#/errors/user-facing-error";
import { createAuth } from "#/integrations/better-auth/auth";
import {
	extractAccessToken,
	isAdminEmail,
	parseAdminEmails,
	verifyAccessToken,
} from "./access-token";

let cachedKeys: { teamDomain: string; getKey: JWTVerifyGetKey } | null = null;

// 公開鍵の一覧は、取得して覚えておく（鍵は、定期的に替わる。jose が、鍵の ID で選び、必要なら取り直す）。
function getAccessKeys(teamDomain: string): JWTVerifyGetKey {
	if (cachedKeys?.teamDomain !== teamDomain) {
		cachedKeys = {
			teamDomain,
			getKey: createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`)),
		};
	}

	return cachedKeys.getKey;
}

// 管理者の画面のサーバー関数の入口。
// 本番：Cloudflare Access のトークンを検証し、そのメールが ADMIN_EMAILS にあるときだけ通す。
//   設定（CF_ACCESS_TEAM_DOMAIN・CF_ACCESS_AUD・ADMIN_EMAILS）が足りないときは、誰も通さない。
// 開発：Access の設定がなければ、ログイン中のメールが ADMIN_EMAILS にあるときだけ通す（開発サーバーだけ）。
export async function requireAdmin() {
	const headers = getRequestHeaders();
	const adminEmails = parseAdminEmails(env.ADMIN_EMAILS);

	if (adminEmails.length === 0) {
		throw new UserFacingError("管理者として確認できません");
	}

	const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.replace(/\/+$/u, "");
	const audience = env.CF_ACCESS_AUD;

	if (teamDomain && audience) {
		const token = extractAccessToken(headers);
		const verified = token
			? await verifyAccessToken(token, {
					issuer: teamDomain,
					audience,
					getKey: getAccessKeys(teamDomain),
				})
			: null;

		if (!verified || !isAdminEmail(verified.email, adminEmails)) {
			throw new UserFacingError("管理者として確認できません");
		}

		const { db } = await createDb();

		return { db, adminEmail: verified.email };
	}

	if (import.meta.env.DEV) {
		const { db } = await createDb();
		const session = await createAuth(db).api.getSession({ headers });

		if (session && isAdminEmail(session.user.email, adminEmails)) {
			return { db, adminEmail: session.user.email };
		}
	}

	throw new UserFacingError("管理者として確認できません");
}
