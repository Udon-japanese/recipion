import type { CSSProperties, ReactNode } from "react";

import { APP_DISPLAY_NAME, APP_ORIGIN, CONTACT_EMAIL } from "#/config/app";
import { colors, fontFamily, monoFontFamily } from "./email-styles";

// メール用の部品。メールソフトは CSS の対応が限られるため、
// レイアウトは table で組み、装飾は、各要素の style（インライン）に書く。
// 利用者の名前などの文字は、React が自動でエスケープする。

const MASCOT_URL = `${APP_ORIGIN}/email/mascot.png`;

const hiddenPreheader: CSSProperties = {
	display: "none",
	maxHeight: 0,
	overflow: "hidden",
	opacity: 0,
	color: colors.page,
};

const text: CSSProperties = {
	fontFamily,
	color: colors.text,
};

export function EmailLayout({
	preheader,
	children,
}: {
	// メールソフトの一覧に、件名の横に出る短い文。
	preheader: string;
	children: ReactNode;
}) {
	return (
		<html lang="ja">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<meta name="color-scheme" content="light" />
				<title>{APP_DISPLAY_NAME}</title>
			</head>
			<body style={{ margin: 0, padding: 0, background: colors.page }}>
				<div style={hiddenPreheader}>{preheader}</div>
				<table
					role="presentation"
					width="100%"
					cellPadding={0}
					cellSpacing={0}
					border={0}
					style={{ background: colors.page }}
				>
					<tbody>
						<tr>
							<td align="center" style={{ padding: "32px 16px" }}>
								<table
									role="presentation"
									width="100%"
									cellPadding={0}
									cellSpacing={0}
									border={0}
									style={{ width: "100%", maxWidth: 480 }}
								>
									<tbody>
										<tr>
											<td align="center" style={{ paddingBottom: 20 }}>
												<img
													src={MASCOT_URL}
													width={72}
													height={72}
													alt=""
													style={{
														display: "block",
														border: 0,
														borderRadius: 22,
													}}
												/>
												<div
													style={{
														...text,
														marginTop: 10,
														fontSize: 18,
														fontWeight: 700,
														letterSpacing: 1,
													}}
												>
													{APP_DISPLAY_NAME}
												</div>
											</td>
										</tr>
										<tr>
											<td
												style={{
													background: colors.card,
													border: `1px solid ${colors.border}`,
													borderRadius: 24,
													padding: "36px 28px",
												}}
											>
												{children}
											</td>
										</tr>
										<tr>
											<td
												align="center"
												style={{
													...text,
													padding: "20px 8px 0",
													fontSize: 12,
													lineHeight: 1.7,
													color: colors.muted,
												}}
											>
												このメールは自動で送られています。
												<br />
												お問い合わせは{" "}
												<a
													href={`mailto:${CONTACT_EMAIL}`}
													style={{ color: colors.muted }}
												>
													{CONTACT_EMAIL}
												</a>{" "}
												へどうぞ。
											</td>
										</tr>
									</tbody>
								</table>
							</td>
						</tr>
					</tbody>
				</table>
			</body>
		</html>
	);
}

export function Heading({ children }: { children: ReactNode }) {
	return (
		<h1
			style={{
				...text,
				margin: "0 0 16px",
				fontSize: 22,
				lineHeight: 1.4,
				fontWeight: 800,
			}}
		>
			{children}
		</h1>
	);
}

export function Paragraph({ children }: { children: ReactNode }) {
	return (
		<p
			style={{
				...text,
				margin: "0 0 16px",
				fontSize: 15,
				lineHeight: 1.8,
			}}
		>
			{children}
		</p>
	);
}

// 補足の小さな文。
export function Note({ children }: { children: ReactNode }) {
	return (
		<p
			style={{
				...text,
				margin: "0 0 6px",
				fontSize: 13,
				lineHeight: 1.7,
				color: colors.muted,
			}}
		>
			{children}
		</p>
	);
}

// ログイン用のコードなど、目立たせたい短い文字列。
export function CodeBlock({ children }: { children: string }) {
	return (
		<div
			style={{
				margin: "8px 0 20px",
				padding: "22px 12px",
				background: colors.accentSoft,
				borderRadius: 16,
				textAlign: "center",
				fontFamily: monoFontFamily,
				fontSize: 36,
				fontWeight: 700,
				letterSpacing: 10,
				color: colors.text,
			}}
		>
			{children}
		</div>
	);
}

export function ButtonLink({
	href,
	tone = "primary",
	children,
}: {
	href: string;
	tone?: "primary" | "danger";
	children: ReactNode;
}) {
	const isDanger = tone === "danger";

	return (
		<table
			role="presentation"
			cellPadding={0}
			cellSpacing={0}
			border={0}
			style={{ margin: "8px auto 20px" }}
		>
			<tbody>
				<tr>
					<td
						style={{
							background: isDanger ? colors.danger : colors.accent,
							borderRadius: 999,
						}}
					>
						<a
							href={href}
							style={{
								...text,
								display: "inline-block",
								padding: "14px 36px",
								fontSize: 16,
								fontWeight: 700,
								color: isDanger ? "#ffffff" : colors.text,
								textDecoration: "none",
							}}
						>
							{children}
						</a>
					</td>
				</tr>
			</tbody>
		</table>
	);
}

// ボタンが使えない環境のために、リンクの文字も出す。
export function LinkFallback({ url }: { url: string }) {
	return (
		<p
			style={{
				...text,
				margin: "0 0 16px",
				fontSize: 12,
				lineHeight: 1.6,
				color: colors.muted,
				wordBreak: "break-all",
			}}
		>
			ボタンが開けないときは、次のリンクをブラウザに貼ってください。
			<br />
			{url}
		</p>
	);
}
