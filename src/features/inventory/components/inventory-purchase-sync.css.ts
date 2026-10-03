import { style } from "@vanilla-extract/css";

export const container = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 12,
	width: "min(100% - 32px, 640px)",
	margin: "16px auto 0",
	padding: 12,
	color: "var(--color-text)",
	background: "var(--color-surface-subtle)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
});

export const message = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 14,
});

export const retryButton = style({
	minHeight: 40,
	paddingInline: 14,
	color: "var(--color-primary)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
	fontWeight: 600,
	cursor: "pointer",

	selectors: {
		"&:hover": {
			borderColor: "var(--color-primary)",
		},

		"&:focus-visible": {
			outline: "3px solid var(--color-primary-soft)",
			outlineOffset: 2,
		},
	},
});
