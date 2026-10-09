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
	fontSize: 24,
});

export const meta = style({
	margin: "4px 0 16px",
	color: "var(--color-text-muted)",
	fontSize: 13,
});

export const articleTitle = style({
	margin: "24px 0 8px",
	fontSize: 17,
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
