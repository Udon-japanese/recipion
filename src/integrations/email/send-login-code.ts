import { APP_DISPLAY_NAME } from "#/config/app";
import { OTP_EXPIRES_IN_SECONDS } from "#/config/auth";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

type LoginCodeEmail = {
	subject: string;
	text: string;
};

export function renderLoginCodeEmail(otp: string): LoginCodeEmail {
	const minutes = Math.floor(OTP_EXPIRES_IN_SECONDS / 60);

	return {
		subject: `【${APP_DISPLAY_NAME}】ログイン用コード: ${otp}`,
		text: [
			`${APP_DISPLAY_NAME}のログイン用コードです。`,
			"",
			otp,
			"",
			`このコードは${minutes}分間有効です。`,
			"心当たりがない場合は、このメールを破棄してください。",
		].join("\n"),
	};
}

type SendLoginCodeInput = {
	to: string;
	otp: string;
	// 差出人（例: `れしぴょん <login@recipion.app>`）。
	from: string;
	apiKey: string;
};

// Resend の REST API でログイン用コードを送る（https://resend.com/docs/api-reference/emails/send-email）。
export async function sendLoginCodeEmail(
	input: SendLoginCodeInput,
	fetchImpl: typeof fetch = fetch,
): Promise<void> {
	const { subject, text } = renderLoginCodeEmail(input.otp);

	const response = await fetchImpl(RESEND_ENDPOINT, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${input.apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: input.from,
			to: [input.to],
			subject,
			text,
		}),
	});

	if (!response.ok) {
		// 応答の本文は、ログに出さない（宛先やコードを含みうるため）。状態コードだけを伝える。
		throw new Error(
			`ログイン用コードのメールを送信できませんでした（${response.status}）`,
		);
	}
}
