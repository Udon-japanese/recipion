import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 16,
});

export const estimateNote = style({
	display: "flex",
	alignItems: "flex-start",
	gap: 8,
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const group = style({
	display: "grid",
	gap: 8,
});

export const groupLabel = style({
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
	lineHeight: "var(--line-height-tight)",
});
