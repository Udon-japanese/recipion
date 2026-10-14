import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	justifyItems: "center",
	gap: 16,
	width: "min(100% - 32px, 480px)",
	marginInline: "auto",
	paddingBlock: 48,
	color: "var(--color-text)",
	textAlign: "center",
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-xl)",
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: "var(--line-height-tight)",
});

export const text = style({
	margin: 0,
	color: "var(--color-text-muted)",
	lineHeight: 1.7,
});
