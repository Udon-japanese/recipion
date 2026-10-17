import { APP_DISPLAY_NAME } from "#/config/app";
import { OTP_EXPIRES_IN_SECONDS } from "#/config/auth";
import {
	CodeBlock,
	EmailLayout,
	Heading,
	Note,
	Paragraph,
} from "./email-components";
import type { EmailMessage } from "./mailer";
import { renderEmail } from "./render-email";

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
		html: renderEmail(
			<EmailLayout preheader={`ログイン用コード: ${otp}`}>
				<Heading>ログイン用コード</Heading>
				<Paragraph>
					{APP_DISPLAY_NAME}
					にログインするためのコードです。画面に入力してください。
				</Paragraph>
				<CodeBlock>{otp}</CodeBlock>
				<Note>{validity}</Note>
				<Note>{ignore}</Note>
			</EmailLayout>,
		),
	};
}
