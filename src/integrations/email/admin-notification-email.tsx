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

// 管理者へのお知らせの内容。投稿の中身や、利用者の情報は、書かない（件数と、画面のリンクだけ）。
export function adminNotificationEmail(input: {
	// 例：「通報」「自動検知」「停止への申し立て」
	kindLabel: string;
	openCount: number;
	url: string;
}): Omit<EmailMessage, "to"> {
	const lead = `${APP_DISPLAY_NAME}の管理者へのお知らせです。`;
	const summary = `${input.kindLabel}の未対応が、${input.openCount}件あります。`;
	const guide = "次のリンクから、確認して、対応してください。";
	const interval = "同じ種類のお知らせは、30分に1通までです。";

	return {
		subject: `【${APP_DISPLAY_NAME}】${input.kindLabel}があります（未対応${input.openCount}件）`,
		text: [lead, "", summary, guide, "", input.url, "", interval].join("\n"),
		html: renderEmail(
			<EmailLayout preheader={summary}>
				<Heading>{input.kindLabel}があります</Heading>
				<Paragraph>{lead}</Paragraph>
				<Paragraph>
					{summary}
					{guide}
				</Paragraph>
				<ButtonLink href={input.url}>管理者の画面を開く</ButtonLink>
				<LinkFallback url={input.url} />
				<Note>{interval}</Note>
			</EmailLayout>,
		),
	};
}
