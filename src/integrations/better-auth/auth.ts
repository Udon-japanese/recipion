import { env, waitUntil } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { captcha, emailOTP } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";
import {
	OTP_ALLOWED_ATTEMPTS,
	OTP_EXPIRES_IN_SECONDS,
	OTP_LENGTH,
} from "#/config/auth";
import { TURNSTILE_TEST_SECRET_KEY } from "#/config/turnstile";
import type { DB } from "#/db/client";
import { hashEmailForBan } from "#/features/moderation/infrastructure/hash-email";
import { bannedEmail } from "#/features/moderation/infrastructure/moderation.sql";
import {
	defaultDisplayName,
	generateHandle,
} from "#/features/profile/domain/profile";
import * as authSchema from "#/integrations/better-auth/auth.sql";
import { AUTH_RATE_LIMITED_CODE } from "#/integrations/better-auth/auth-error-message";
import {
	type AuthRateLimiters,
	checkAuthRateLimit,
	SEND_CODE_PATH,
} from "#/integrations/better-auth/auth-rate-limit";
import { sendLoginCodeEmail } from "#/integrations/email/send-login-code";

const isDevelopment = import.meta.env.DEV;

// wrangler.jsonc の `ratelimits` のバインディング。開発サーバーで使えない場合は、undefined になる。
function getRateLimiters(): AuthRateLimiters | null {
	const limiters = {
		sendByEmail: env.AUTH_SEND_EMAIL_LIMITER,
		sendByIp: env.AUTH_SEND_IP_LIMITER,
		verifyByIp: env.AUTH_VERIFY_IP_LIMITER,
	};

	if (!limiters.sendByEmail || !limiters.sendByIp || !limiters.verifyByIp) {
		return null;
	}

	return limiters as AuthRateLimiters;
}

// コードの送信。本番では Resend で送る。
// 開発中に API キー（RESEND_API_KEY）がない場合は、メールを送らず、コードをコンソールに出す。
async function deliverLoginCode(email: string, otp: string): Promise<void> {
	if (env.RESEND_API_KEY && env.AUTH_EMAIL_FROM) {
		await sendLoginCodeEmail({
			to: email,
			otp,
			from: env.AUTH_EMAIL_FROM,
			apiKey: env.RESEND_API_KEY,
		});

		return;
	}

	if (isDevelopment) {
		console.log(`[開発用] ログイン用コード（${email}）: ${otp}`);

		return;
	}

	throw new Error(
		"メール送信の設定（RESEND_API_KEY、AUTH_EMAIL_FROM）がありません",
	);
}

// 0 以上 size 未満の乱数（ハンドルの自動生成用）。
function randomIndex(size: number): number {
	const [value] = crypto.getRandomValues(new Uint32Array(1));

	return (value ?? 0) % size;
}

export function createAuth(db: DB) {
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: "pg",
			schema: authSchema,
		}),
		// パスワードは使わない。メールのワンタイムコードだけでログインする（emailOTP プラグイン）。
		advanced: {
			// メールの送信を await せず、応答を返したあとに続ける（応答時間の差による、アカウントの有無の推測を避ける）。
			backgroundTasks: { handler: (promise) => waitUntil(promise) },
		},
		user: {
			// ハンドル。クライアントからは書けない（input: false）。更新は、プロフィールの検証つきのサーバー関数で行う。
			additionalFields: {
				handle: { type: "string", required: false, input: false },
			},
		},
		databaseHooks: {
			user: {
				create: {
					// コードでの初回ログインで、ユーザーが自動作成される。表示名は、既定の名前（メールアドレスの一部は、公開されないよう、使わない）。ハンドルは、自動で付ける。
					before: async (user) => {
						// 永久停止されたメールアドレスは、新しく登録できない。
						const emailHash = await hashEmailForBan(
							user.email,
							env.BETTER_AUTH_SECRET,
						);
						const [banned] = await db
							.select({ emailHash: bannedEmail.emailHash })
							.from(bannedEmail)
							.where(eq(bannedEmail.emailHash, emailHash))
							.limit(1);

						if (banned) {
							throw APIError.from("FORBIDDEN", {
								message: "このメールアドレスでは、登録できません",
								code: "EMAIL_BANNED",
							});
						}

						return {
							data: {
								...user,
								name: user.name?.trim() || defaultDisplayName,
								handle: generateHandle(randomIndex),
							},
						};
					},
				},
			},
		},
		hooks: {
			// コードの送信と検証に、レート制限をかける（メールの爆撃と、総当たりを防ぐ）。
			before: createAuthMiddleware(async (ctx) => {
				const limiters = getRateLimiters();

				if (!limiters) {
					// 開発サーバーでは、バインディングがなくてもよい。本番では、設定漏れとして拒否する（安全側）。
					if (isDevelopment) return;

					throw APIError.from("INTERNAL_SERVER_ERROR", {
						message: "レート制限の設定がありません",
						code: "RATE_LIMIT_NOT_CONFIGURED",
					});
				}

				const body = (ctx.body ?? {}) as { email?: unknown };
				const result = await checkAuthRateLimit(
					{
						path: ctx.path,
						email: typeof body.email === "string" ? body.email : null,
						ip: ctx.request?.headers.get("cf-connecting-ip") ?? "unknown",
					},
					limiters,
				);

				if (!result.allowed) {
					throw APIError.from("TOO_MANY_REQUESTS", {
						message: "Too many requests",
						code: AUTH_RATE_LIMITED_CODE,
					});
				}
			}),
		},
		plugins: [
			emailOTP({
				otpLength: OTP_LENGTH,
				expiresIn: OTP_EXPIRES_IN_SECONDS,
				allowedAttempts: OTP_ALLOWED_ATTEMPTS,
				// コードは、ハッシュ化して保存する（データベースが漏れても、コードが読めない）。
				storeOTP: "hashed",
				async sendVerificationOTP({ email, otp, type }) {
					// このアプリは、ログイン用のコードだけを使う。
					if (type !== "sign-in") return;

					await deliverLoginCode(email, otp);
				},
			}),
			// コードの送信（メールの爆撃の入口）を、Turnstile のトークンで保護する。
			captcha({
				provider: "cloudflare-turnstile",
				secretKey:
					env.TURNSTILE_SECRET_KEY ??
					(isDevelopment ? TURNSTILE_TEST_SECRET_KEY : ""),
				endpoints: [SEND_CODE_PATH],
			}),
			tanstackStartCookies(),
		],
	});
}
