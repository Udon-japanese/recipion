import { style } from "@vanilla-extract/css";

const PC = "(min-width: 768px)";

export const page = style({
	minHeight: "100dvh",
	background: "var(--color-background)",
});

// スマホの上のヘッダー（戻る・見出し）。
export const header = style({
	position: "sticky",
	top: 0,
	zIndex: 10,
	display: "flex",
	alignItems: "center",
	gap: 4,
	height: 56,
	padding: "0 6px",
	background: "var(--color-background)",
	borderBottom: "1px solid var(--color-border)",

	"@media": {
		[PC]: { display: "none" },
	},
});

export const title = style({
	margin: 0,
	fontSize: 18,
	fontWeight: "var(--font-weight-bold)",
	lineHeight: 1.35,
});

export const main = style({
	display: "flex",
	flexDirection: "column",
	gap: 20,
	padding: "20px 16px 32px",

	"@media": {
		[PC]: {
			width: 440,
			marginInline: "auto",
			padding: "120px 0 32px",
		},
	},
});

// PC では、マスコットと大きな見出し（スマホは、ヘッダーに見出しがある）。
export const heading = style({
	display: "none",

	"@media": {
		[PC]: { display: "flex", alignItems: "center", gap: 12 },
	},
});

export const headingTitle = style({
	margin: 0,
	fontSize: 22,
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: 1.35,
});

// PC では、白いカードに入れる。
export const panel = style({
	"@media": {
		[PC]: {
			padding: 24,
			borderRadius: "var(--radius-card)",
			background: "var(--color-surface)",
			boxShadow: "var(--shadow-sm)",
		},
	},
});
