import { style } from "@vanilla-extract/css";

export const container = style({
	width: "min(100% - 32px, 720px)",
	marginInline: "auto",
	paddingBlock: 24,
	color: "var(--color-text)",
	lineHeight: 1.8,
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-xl)",
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: "var(--line-height-tight)",
});

export const meta = style({
	margin: "4px 0 16px",
	color: "var(--color-text-muted)",
	fontSize: 13,
});

export const articleTitle = style({
	margin: "32px 0 8px",
	paddingBottom: 6,
	borderBottom: "1px solid var(--color-border)",
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-bold)",
});

export const list = style({
	display: "grid",
	gap: 8,
	margin: 0,
	paddingLeft: 24,
});

export const multiline = style({
	whiteSpace: "pre-line",
});
