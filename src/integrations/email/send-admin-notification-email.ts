import { APP_DISPLAY_NAME } from "#/config/app";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// 管理者へのお知らせの内容。投稿の中身や、利用者の情報は、書かない（件数と、画面のリンクだけ）。
export function renderAdminNotificationEmail(input: {
	// 例：「通報」「自動検知」「停止への申し立て」
	kindLabel: string;
	openCount: number;
	url: string;
}): { subject: string; text: string } {
	return {
		subject: `【${APP_DISPLAY_NAME}】${input.kindLabel}があります（未対応${input.openCount}件）`,
		text: [
			`${APP_DISPLAY_NAME}の管理者へのお知らせです。`,
			"",
			`${input.kindLabel}の未対応が、${input.openCount}件あります。`,
			"次のリンクから、確認して、対応してください。",
			"",
			input.url,
			"",
			"同じ種類のお知らせは、30分に1通までです。",
		].join("\n"),
	};
}

type SendAdminNotificationEmailInput = {
	to: readonly string[];
	subject: string;
	text: string;
	from: string;
	apiKey: string;
};

// Resend の REST API で、管理者へのお知らせのメールを送る。
export async function sendAdminNotificationEmail(
	input: SendAdminNotificationEmailInput,
	fetchImpl: typeof fetch = fetch,
): Promise<void> {
	const response = await fetchImpl(RESEND_ENDPOINT, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${input.apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: input.from,
			to: input.to,
			subject: input.subject,
			text: input.text,
		}),
	});

	if (!response.ok) {
		// 応答の本文は、ログに出さない（宛先を含みうるため）。状態コードだけを伝える。
		throw new Error(
			`管理者へのメールを送信できませんでした（${response.status}）`,
		);
	}
}
