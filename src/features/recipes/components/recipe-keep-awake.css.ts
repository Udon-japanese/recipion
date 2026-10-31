import { style } from "@vanilla-extract/css";

export const root = style({
	display: "grid",
	justifyItems: "end",
	gap: 2,
});

export const row = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-medium)",
	lineHeight: "var(--line-height-tight)",
});

export const text = style({ cursor: "pointer" });

export const hint = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
});
