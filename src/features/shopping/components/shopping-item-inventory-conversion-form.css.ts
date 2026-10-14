import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 16,
});

export const intro = style({
	display: "grid",
	gap: 4,
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-bold)",
});

export const description = style({
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

export const form = style({
	display: "grid",
	gap: 16,
});

export const two = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
	gap: 12,
	alignItems: "start",
});

export const actions = style({
	display: "flex",
	gap: 8,
	width: "100%",
});
