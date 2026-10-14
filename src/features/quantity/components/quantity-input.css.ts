import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 6,
});

export const hint = style({
	color: "var(--color-text-muted)",
	fontSize: 13,
});

export const fractionButtons = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 6,
});

export const fractionButton = style({
	minHeight: 32,
	paddingInline: 10,
	color: "var(--color-accent-text)",
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
