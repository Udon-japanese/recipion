import { EMAIL_FROM } from "#/config/app";
import type { Mailer } from "./mailer";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// Resend の REST API でメールを送る（https://resend.com/docs/api-reference/emails/send-email）。
export function createResendMailer(
	apiKey: string,
	fetchImpl: typeof fetch = fetch,
): Mailer {
	return {
		async send({ to, subject, text, html }) {
			const response = await fetchImpl(RESEND_ENDPOINT, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${apiKey}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					from: EMAIL_FROM,
					to: typeof to === "string" ? [to] : to,
					subject,
					text,
					html,
				}),
			});

			if (!response.ok) {
				// 応答の本文は、ログに出さない（宛先やコード・リンクを含みうるため）。状態コードだけを伝える。
				throw new Error(`メールを送信できませんでした（${response.status}）`);
			}
		},
	};
}
