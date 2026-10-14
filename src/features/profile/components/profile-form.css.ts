import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 16,
	color: "var(--color-text)",
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-xl)",
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: "var(--line-height-tight)",
});

export const lead = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 14,
});

export const form = style({
	display: "grid",
	gap: 20,
});

export const handleRow = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
});

export const at = style({
	color: "var(--color-text-muted)",
	fontWeight: "var(--font-weight-bold)",
});

export const actions = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 12,
});
