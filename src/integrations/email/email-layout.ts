import { APP_DISPLAY_NAME, APP_ORIGIN } from "#/config/app";

// メールの HTML は、CSS 変数・外部の CSS・Flexbox が使えないメールソフトがあるため、
// 色は直接書き、レイアウトは table で組み、スタイルは各要素に書く（インライン）。
// 色は src/styles.css のトークンに合わせる（text: --color-text、accent: --color-mascot）。
const colors = {
	page: "#fbf4de",
	card: "#fffdf7",
	border: "#eadfb8",
	text: "#292720",
	muted: "#6b6657",
	accent: "#e9a900",
	danger: "#b3261e",
} as const;

const fontFamily =
	'-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif';

const MASCOT_URL = `${APP_ORIGIN}/email/mascot.png`;

// HTML に埋め込む文字を、エスケープする（利用者の名前などが、タグとして解釈されないように）。
export function escapeHtml(text: string): string {
	return text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

export function emailParagraph(text: string): string {
	return `<p style="margin:0 0 16px;font-family:${fontFamily};font-size:15px;line-height:1.8;color:${colors.text};">${escapeHtml(text)}</p>`;
}

export function emailNote(text: string): string {
	return `<p style="margin:0 0 8px;font-family:${fontFamily};font-size:13px;line-height:1.7;color:${colors.muted};">${escapeHtml(text)}</p>`;
}

// ログイン用のコードなど、目立たせたい短い文字列。
export function emailCodeBlock(code: string): string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;"><tr><td style="background:#ffffff;border:2px solid ${colors.accent};border-radius:12px;padding:14px 28px;font-size:32px;font-weight:700;letter-spacing:8px;color:${colors.text};font-family:ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;">${escapeHtml(code)}</td></tr></table>`;
}

export function emailButton(
	label: string,
	url: string,
	tone: "primary" | "danger" = "primary",
): string {
	const background = tone === "danger" ? colors.danger : colors.accent;
	const foreground = tone === "danger" ? "#ffffff" : colors.text;

	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px;"><tr><td bgcolor="${background}" style="background:${background};border-radius:12px;"><a href="${escapeHtml(url)}" style="display:inline-block;font-family:${fontFamily};padding:14px 28px;font-size:16px;font-weight:700;color:${foreground};text-decoration:none;">${escapeHtml(label)}</a></td></tr></table>`;
}

// ボタンが使えない環境のために、リンクの文字も出す。
export function emailLinkText(url: string): string {
	return `<p style="margin:0 0 16px;font-family:${fontFamily};font-size:12px;line-height:1.6;color:${colors.muted};word-break:break-all;">ボタンが開けないときは、次のリンクをブラウザに貼ってください。<br />${escapeHtml(url)}</p>`;
}

type EmailLayoutInput = {
	// メールソフトの一覧に、件名の横に出る短い文。
	preheader: string;
	// emailParagraph などで作った HTML。
	bodyHtml: string;
};

export function renderEmailHtml({
	preheader,
	bodyHtml,
}: EmailLayoutInput): string {
	return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(APP_DISPLAY_NAME)}</title>
</head>
<body style="margin:0;padding:0;background:${colors.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${colors.page};">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${colors.page};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;background:${colors.card};border:1px solid ${colors.border};border-radius:20px;font-family:${fontFamily};">
<tr><td style="padding:28px 28px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="padding-right:12px;"><img src="${MASCOT_URL}" width="56" height="56" alt="" style="display:block;border:0;border-radius:14px;" /></td>
<td style="font-size:22px;font-weight:700;color:${colors.text};font-family:${fontFamily};">${escapeHtml(APP_DISPLAY_NAME)}</td>
</tr></table>
</td></tr>
<tr><td style="padding:24px 28px 8px;font-family:${fontFamily};">
${bodyHtml}
</td></tr>
<tr><td style="padding:8px 28px 28px;font-family:${fontFamily};font-size:12px;line-height:1.6;color:${colors.muted};border-top:1px solid ${colors.border};">
<p style="margin:16px 0 0;font-family:${fontFamily};font-size:12px;line-height:1.6;color:${colors.muted};">このメールは自動で送られています。お問い合わせは contact@recipion.app へお送りください。</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
