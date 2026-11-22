import { consoleMailer } from "./console-mailer";
import type { Mailer } from "./mailer";
import { createResendMailer } from "./resend-mailer";

// 環境に合った Mailer を選ぶ。
// 開発中は、RESEND_API_KEY があっても送らず、コンソールに出す（開発の操作で、本物のメールと Resend の無料枠を使わないため）。
// 本番は Resend。キーがなければエラー。
export function selectMailer({
	resendApiKey,
	isDevelopment,
}: {
	resendApiKey: string | undefined;
	isDevelopment: boolean;
}): Mailer {
	if (isDevelopment) {
		return consoleMailer;
	}

	if (resendApiKey) {
		return createResendMailer(resendApiKey);
	}

	throw new Error("メール送信の設定（RESEND_API_KEY）がありません");
}
