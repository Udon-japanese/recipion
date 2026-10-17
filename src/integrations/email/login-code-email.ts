import { APP_DISPLAY_NAME } from "#/config/app";
import { OTP_EXPIRES_IN_SECONDS } from "#/config/auth";
import {
	emailCodeBlock,
	emailNote,
	emailParagraph,
	renderEmailHtml,
} from "./email-layout";
import type { EmailMessage } from "./mailer";

// ログイン用コードのメール。
export function loginCodeEmail(to: string, otp: string): EmailMessage {
	const minutes = Math.floor(OTP_EXPIRES_IN_SECONDS / 60);
	const validity = `このコードは${minutes}分間有効です。`;
	const ignore = "心当たりがない場合は、このメールを破棄してください。";

	return {
		to,
		subject: `【${APP_DISPLAY_NAME}】ログイン用コード: ${otp}`,
		text: [
			`${APP_DISPLAY_NAME}のログイン用コードです。`,
			"",
			otp,
			"",
			validity,
			ignore,
		].join("\n"),
		html: renderEmailHtml({
			preheader: `ログイン用コード: ${otp}`,
			bodyHtml: [
				emailParagraph(`${APP_DISPLAY_NAME}のログイン用コードです。`),
				emailCodeBlock(otp),
				emailNote(validity),
				emailNote(ignore),
			].join("\n"),
		}),
	};
}
