import { style } from "@vanilla-extract/css";

export const group = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 2,
	whiteSpace: "nowrap",
});

export const key = style({
	padding: "0 5px",
	background: "var(--color-surface-muted)",
	border: "1px solid var(--color-border)",
	borderRadius: 4,
	font: "inherit",
	fontSize: "0.9em",
	lineHeight: 1.5,
});

export const separator = style({
	color: "var(--color-text-muted)",
});
