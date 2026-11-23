import { env, waitUntil } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { bearer, emailOTP } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import {
	OTP_ALLOWED_ATTEMPTS,
	OTP_EXPIRES_IN_SECONDS,
	OTP_LENGTH,
	SESSION_EXPIRES_IN_SECONDS,
	SESSION_UPDATE_AGE_SECONDS,
} from "#/config/auth";
import { TURNSTILE_TEST_SECRET_KEY } from "#/config/turnstile";
import type { DB } from "#/db/client";
import { hashEmailForBan } from "#/features/moderation/infrastructure/hash-email";
import {
	accountSuspension,
	bannedEmail,
} from "#/features/moderation/infrastructure/moderation.sql";
import {
	defaultDisplayName,
	generateHandle,
} from "#/features/profile/domain/profile";
import { userReport } from "#/features/reports/infrastructure/user-report.sql";
import * as authSchema from "#/integrations/better-auth/auth.sql";
import { AUTH_RATE_LIMITED_CODE } from "#/integrations/better-auth/auth-error-message";
import {
	type AuthRateLimiters,
	checkAuthRateLimit,
	emailRateLimitKey,
	SEND_CODE_PATH,
} from "#/integrations/better-auth/auth-rate-limit";
import {
	checkSendCodeRequest,
	type SendCodeBotCheck,
} from "#/integrations/better-auth/send-code-bot-check";
import {
	generateDemoLoginCode,
	isDemoLoginEmail,
	readDemoLoginConfig,
} from "#/integrations/demo-login/demo-login";
import {
	DELETE_ACCOUNT_LINK_EXPIRES_IN_SECONDS,
	deleteAccountEmail,
} from "#/integrations/email/delete-account-email";
import { getMailer } from "#/integrations/email/get-mailer";
import { loginCodeEmail } from "#/integrations/email/login-code-email";
import {
	createPlayIntegrityClient,
	type PlayIntegrityClient,
} from "#/integrations/play-integrity/play-integrity-client";
import { verifySendCodeIntegrity } from "#/integrations/play-integrity/verify-send-code-integrity";
import { verifyTurnstileToken } from "#/integrations/turnstile/verify-turnstile-token";

const isDevelopment = import.meta.env.DEV;

// wrangler.jsonc の `ratelimits` のバインディング。開発サーバーで使えない場合は、undefined になる。
function getRateLimiters(): AuthRateLimiters | null {
	const limiters = {
		sendByEmail: env.AUTH_SEND_EMAIL_LIMITER,
		sendByIp: env.AUTH_SEND_IP_LIMITER,
		verifyByIp: env.AUTH_VERIFY_IP_LIMITER,
		sendUnverified: env.AUTH_SEND_UNVERIFIED_LIMITER,
	};

	if (
		!limiters.sendByEmail ||
		!limiters.sendByIp ||
		!limiters.verifyByIp ||
		!limiters.sendUnverified
	) {
		return null;
	}

	return limiters as AuthRateLimiters;
}

// Google のアクセストークンを、要求をまたいで使い回すため、Worker の中で1つだけ作る。
let playIntegrity: {
	serviceAccount: string;
	client: PlayIntegrityClient;
} | null = null;

function getPlayIntegrityClient(): PlayIntegrityClient | null {
	const serviceAccount = env.PLAY_INTEGRITY_SERVICE_ACCOUNT;

	if (!serviceAccount) return null;

	if (playIntegrity?.serviceAccount !== serviceAccount) {
		playIntegrity = {
			serviceAccount,
			client: createPlayIntegrityClient(serviceAccount),
		};
	}

	return playIntegrity.client;
}

function getTurnstileSecretKey(): string {
	const secretKey =
		env.TURNSTILE_SECRET_KEY ??
		(isDevelopment ? TURNSTILE_TEST_SECRET_KEY : "");

	if (secretKey === "") {
		throw new Error("Turnstile のシークレットキーがありません");
	}

	return secretKey;
}

// コードの送信（メールの爆撃の入口）を、Turnstile（Web）と Play Integrity（Android）で守る。
// エラーのコードと状態は、前に使っていた Better Auth の captcha プラグインと同じにする（画面のエラーの文が、コードで決まる）。
async function checkSendCodeBot(
	headers: Headers,
	email: string | null,
	ip: string | null,
): Promise<SendCodeBotCheck> {
	let result: SendCodeBotCheck;

	try {
		result = await checkSendCodeRequest(
			{ headers, email },
			{
				turnstile: (token) =>
					verifyTurnstileToken({
						token,
						secretKey: getTurnstileSecretKey(),
						remoteIp: ip,
					}),
				playIntegrity: async (token, requestEmail) => {
					const client = getPlayIntegrityClient();

					return client
						? verifySendCodeIntegrity(client, token, requestEmail)
						: false;
				},
			},
		);
	} catch (error) {
		console.error("[auth] ボットの判定ができませんでした", error);

		throw APIError.from("INTERNAL_SERVER_ERROR", {
			message: "Something went wrong",
			code: "UNKNOWN_ERROR",
		});
	}

	if (result.status === "rejected") {
		throw result.code === "MISSING_RESPONSE"
			? APIError.from("BAD_REQUEST", {
					message: "Missing CAPTCHA response",
					code: result.code,
				})
			: APIError.from("FORBIDDEN", {
					message: "Captcha verification failed",
					code: result.code,
				});
	}

	return result;
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
		// セッションは、使うたびに（前回の延長から1日たっていれば）「今から30日後」まで延びる。30日間使わなければ切れる。
		// 期限は全体で1つ（Web とアプリで分けられない）。2026-11-22 に、既定の7日から30日にした。
		session: {
			expiresIn: SESSION_EXPIRES_IN_SECONDS,
			updateAge: SESSION_UPDATE_AGE_SECONDS,
		},
		// パスワードは使わない。メールのワンタイムコードだけでログインする（emailOTP プラグイン）。
		advanced: {
			// メールの送信を await せず、応答を返したあとに続ける（応答時間の差による、アカウントの有無の推測を避ける）。
			backgroundTasks: { handler: (promise) => waitUntil(promise) },
		},
		user: {
			// ハンドルとアバター。クライアントからは書けない（input: false）。更新は、検証つきのサーバー関数で行う。
			additionalFields: {
				handle: { type: "string", required: false, input: false },
				avatar: { type: "json", required: false, input: false },
			},
			// アカウントの削除。確認のメールのリンクを開いたときに、すぐに削除する（取り消せない）。
			// 連鎖で消えるもの・残るものは、DB の外部キーで決まっている（プライバシーポリシーの「保存と削除」を参照）。
			deleteUser: {
				enabled: true,
				deleteTokenExpiresIn: DELETE_ACCOUNT_LINK_EXPIRES_IN_SECONDS,
				sendDeleteAccountVerification: async ({ user, url }) => {
					// 同じメールアドレス宛ての送信は、ログイン用コードと同じ上限で制限する（メール爆撃の防止）。
					const limiters = getRateLimiters();

					if (limiters) {
						const key = await emailRateLimitKey(user.email);
						const result = await limiters.sendByEmail.limit({ key });

						if (!result.success) {
							throw APIError.from("TOO_MANY_REQUESTS", {
								message: "Too many requests",
								code: AUTH_RATE_LIMITED_CODE,
							});
						}
					}

					await getMailer().send(deleteAccountEmail(user.email, url));
				},
				beforeDelete: async (user) => {
					// 停止中のアカウントは、削除して作り直すことで停止から逃れられないよう、削除できない。
					const [suspension] = await db
						.select({ userId: accountSuspension.userId })
						.from(accountSuspension)
						.where(eq(accountSuspension.userId, user.id))
						.limit(1);

					if (suspension) {
						throw APIError.from("FORBIDDEN", {
							message: "停止中のアカウントは削除できません",
							code: "ACCOUNT_SUSPENDED",
						});
					}

					// 他の人から受けたユーザー名の通報の記録は残すが、名前とハンドルの控えは消す（退会した人の情報を残さない）。
					await db
						.update(userReport)
						.set({ reportedName: "", reportedHandle: "" })
						.where(eq(userReport.reportedUserId, user.id));
				},
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
								message: "このメールアドレスでは登録できません",
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
			// コードの送信と検証に、ボットの判定とレート制限をかける（メールの爆撃と、総当たりを防ぐ）。
			before: createAuthMiddleware(async (ctx) => {
				const body = (ctx.body ?? {}) as { email?: unknown };
				const email = typeof body.email === "string" ? body.email : null;
				const ip = ctx.request?.headers.get("cf-connecting-ip") ?? null;
				// サーバーの中からの呼び出し（ctx.request がない）は、判定しない。
				const botCheck =
					ctx.path === SEND_CODE_PATH && ctx.request
						? await checkSendCodeBot(ctx.request.headers, email, ip)
						: null;
				const limiters = getRateLimiters();

				if (!limiters) {
					// 開発サーバーでは、バインディングがなくてもよい。本番では、設定漏れとして拒否する（安全側）。
					if (isDevelopment) return;

					throw APIError.from("INTERNAL_SERVER_ERROR", {
						message: "レート制限の設定がありません",
						code: "RATE_LIMIT_NOT_CONFIGURED",
					});
				}

				const result = await checkAuthRateLimit(
					{
						path: ctx.path,
						email,
						ip: ip ?? "unknown",
						unverified: botCheck?.status === "unverified",
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
				// 確認用アカウント（環境変数で有効にしたときだけ）は、固定のコード。ほかのアドレスは、通常のコード。
				generateOTP: ({ email }) =>
					generateDemoLoginCode(readDemoLoginConfig(env), email),
				async sendVerificationOTP({ email, otp, type }) {
					// このアプリは、ログイン用のコードだけを使う。
					if (type !== "sign-in") return;

					// 確認用アカウントには、メールを送らない。
					if (isDemoLoginEmail(readDemoLoginConfig(env), email)) return;

					await getMailer().send(loginCodeEmail(email, otp));
				},
			}),
			// アプリ用：`Authorization: Bearer <token>` をセッションとして受け付け、ログインの応答に `set-auth-token` を付ける。
			// Cookie のない要求は、Better Auth の Origin の確認の対象外なので、アプリから Origin なしで呼べる。
			bearer(),
		],
	});
}
