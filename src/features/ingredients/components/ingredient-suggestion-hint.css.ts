import { style } from "@vanilla-extract/css";

export const list = style({
	display: "grid",
	gap: 6,
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const row = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 8,
	fontSize: "var(--font-size-sm)",
	color: "var(--color-text-muted)",
});

export const text = style({
	minWidth: 0,
});

export const actions = style({
	display: "inline-flex",
	flexWrap: "wrap",
	gap: 6,
});

export const message = style({
	flexBasis: "100%",
	margin: 0,
	color: "var(--color-error)",
});
