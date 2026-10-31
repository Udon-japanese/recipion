import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 12,
	paddingTop: 24,
	borderTop: "1px solid var(--color-border)",
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-bold)",
});

export const note = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 14,
	lineHeight: 1.7,
});

export const list = style({
	margin: 0,
	paddingLeft: 20,
	color: "var(--color-text-muted)",
	fontSize: 14,
	lineHeight: 1.7,
});

export const actions = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 12,
});
