import { APP_DISPLAY_NAME } from "#/config/app";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// 削除の確認のリンクの有効時間（秒）。auth.ts の deleteTokenExpiresIn と同じ値を使う。
export const DELETE_ACCOUNT_LINK_EXPIRES_IN_SECONDS = 60 * 60;

export function renderDeleteAccountEmail(url: string): {
	subject: string;
	text: string;
} {
	const minutes = Math.floor(DELETE_ACCOUNT_LINK_EXPIRES_IN_SECONDS / 60);

	return {
		subject: `【${APP_DISPLAY_NAME}】アカウントの削除の確認`,
		text: [
			`${APP_DISPLAY_NAME}のアカウントの削除の確認です。`,
			"",
			"次のリンクを、ログインしているブラウザで開くと、アカウントと、保存した情報（レシピ、在庫など）が、すぐに削除されます。取り消せません。",
			"",
			url,
			"",
			`このリンクは${minutes}分間有効です。`,
			"心当たりがない場合は、このメールを破棄してください（リンクを開かなければ、何も削除されません）。",
		].join("\n"),
	};
}

type SendDeleteAccountEmailInput = {
	to: string;
	url: string;
	from: string;
	apiKey: string;
};

// Resend の REST API で、アカウントの削除の確認のメールを送る。
export async function sendDeleteAccountEmail(
	input: SendDeleteAccountEmailInput,
	fetchImpl: typeof fetch = fetch,
): Promise<void> {
	const { subject, text } = renderDeleteAccountEmail(input.url);

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
		// 応答の本文は、ログに出さない（宛先やリンクを含みうるため）。状態コードだけを伝える。
		throw new Error(
			`削除の確認のメールを送信できませんでした（${response.status}）`,
		);
	}
}
