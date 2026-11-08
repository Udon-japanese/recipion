import { style } from "@vanilla-extract/css";

export const card = style({
	boxSizing: "border-box",
	display: "grid",
	gap: 8,
	padding: 16,
	borderRadius: "var(--radius-card)",
	background: "var(--color-surface-muted)",
	color: "var(--color-text)",
});

export const head = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 8,
	minHeight: 36,
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-bold)",
});

export const text = style({
	margin: 0,
	fontSize: "var(--font-size-sm)",
});

export const note = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
});
