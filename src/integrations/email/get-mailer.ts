import { env } from "cloudflare:workers";

import { consoleMailer } from "./console-mailer";
import type { Mailer } from "./mailer";
import { createResendMailer } from "./resend-mailer";

// 環境に合った Mailer を返す。環境変数を読むのは、ここだけ（cloudflare:workers を読むため、テストからは読まない）。
// RESEND_API_KEY があれば Resend、なければ、開発中はコンソール、本番ではエラー。
export function getMailer(): Mailer {
	if (env.RESEND_API_KEY) {
		return createResendMailer(env.RESEND_API_KEY);
	}

	if (import.meta.env.DEV) {
		return consoleMailer;
	}

	throw new Error("メール送信の設定（RESEND_API_KEY）がありません");
}
