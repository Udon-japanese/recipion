import { APP_DISPLAY_NAME } from "#/config/app";
import {
	ButtonLink,
	EmailLayout,
	Heading,
	LinkFallback,
	Note,
	Paragraph,
} from "./email-components";
import type { EmailMessage } from "./mailer";
import { renderEmail } from "./render-email";

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
		html: renderEmail(
			<EmailLayout preheader="アカウントの削除の確認です。リンクを開くと、すぐに削除されます。">
				<Heading>アカウントの削除の確認</Heading>
				<Paragraph>{lead}</Paragraph>
				<Paragraph>{warning}</Paragraph>
				<ButtonLink href={url} tone="danger">
					アカウントを削除する
				</ButtonLink>
				<LinkFallback url={url} />
				<Note>{validity}</Note>
				<Note>{ignore}</Note>
			</EmailLayout>,
		),
	};
}
