import { APP_DISPLAY_NAME } from "#/config/app";
import {
	emailButton,
	emailLinkText,
	emailNote,
	emailParagraph,
	renderEmailHtml,
} from "./email-layout";
import type { EmailMessage } from "./mailer";

// 削除の確認のリンクの有効時間（秒）。auth.ts の deleteTokenExpiresIn と同じ値を使う。
export const DELETE_ACCOUNT_LINK_EXPIRES_IN_SECONDS = 60 * 60;

// アカウントの削除の確認のメール。
export function deleteAccountEmail(to: string, url: string): EmailMessage {
	const minutes = Math.floor(DELETE_ACCOUNT_LINK_EXPIRES_IN_SECONDS / 60);
	const lead = `${APP_DISPLAY_NAME}のアカウントの削除の確認です。`;
	const warning =
		"次のリンクを、ログインしているブラウザで開くと、アカウントと、保存した情報（レシピ、在庫など）が、すぐに削除されます。取り消せません。";
	const validity = `このリンクは${minutes}分間有効です。`;
	const ignore =
		"心当たりがない場合は、このメールを破棄してください（リンクを開かなければ、何も削除されません）。";

	return {
		to,
		subject: `【${APP_DISPLAY_NAME}】アカウントの削除の確認`,
		text: [lead, "", warning, "", url, "", validity, ignore].join("\n"),
		html: renderEmailHtml({
			preheader:
				"アカウントの削除の確認です。リンクを開くと、すぐに削除されます。",
			bodyHtml: [
				emailParagraph(lead),
				emailParagraph(warning),
				emailButton("アカウントを削除する", url, "danger"),
				emailLinkText(url),
				emailNote(validity),
				emailNote(ignore),
			].join("\n"),
		}),
	};
}
