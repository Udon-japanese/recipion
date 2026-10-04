import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 10,
});

export const row = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
	gap: 10,
});

export const field = style({
	display: "grid",
	gap: 6,
});

export const label = style({
	color: "var(--color-text-muted)",
	fontSize: 14,
	fontWeight: 600,
});

export const input = style({
	minWidth: 0,
	minHeight: 44,
	paddingInline: 12,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
});

export const quickButtons = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 6,
});

export const quickButton = style({
	minHeight: 32,
	paddingInline: 10,
	color: "var(--color-primary)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 16,
	font: "inherit",
	fontSize: 13,
	cursor: "pointer",

	selectors: {
		"&:disabled": {
			cursor: "not-allowed",
			opacity: 0.5,
		},
	},
});
