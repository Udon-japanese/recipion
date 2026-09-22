import { style } from "@vanilla-extract/css";

export const panel = style({
	width: "min(100% - 32px, 640px)",
	marginInline: "auto",
	paddingTop: 24,
});

export const modeButtons = style({
	display: "flex",
	gap: 8,
	marginBottom: 16,
});

export const modeButton = style({
	minHeight: 40,
	paddingInline: 14,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
	cursor: "pointer",

	selectors: {
		"&[aria-pressed='true']": {
			color: "var(--color-primary-text)",
			background: "var(--color-primary)",
			borderColor: "var(--color-primary)",
		},

		"&:focus-visible": {
			outline: "3px solid var(--color-primary-soft)",
			outlineOffset: 2,
		},
	},
});

export const form = style({
	display: "grid",
	gap: 12,
	padding: 16,
	background: "var(--color-surface-subtle)",
	borderRadius: 10,
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

	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-primary-soft)",
			borderColor: "var(--color-primary)",
		},
	},
});

export const primaryButton = style({
	minHeight: 44,
	paddingInline: 18,
	color: "var(--color-primary-text)",
	background: "var(--color-primary)",
	border: 0,
	borderRadius: 8,
	font: "inherit",
	fontWeight: 700,
	cursor: "pointer",
	justifySelf: "end",

	selectors: {
		"&:disabled": {
			cursor: "not-allowed",
			opacity: 0.5,
		},
	},
});

export const secondaryButton = style({
	minHeight: 40,
	paddingInline: 14,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
	cursor: "pointer",
});

export const session = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 16,
	padding: 16,
	background: "var(--color-surface-subtle)",
	borderRadius: 10,
});

export const sessionLabel = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 12,
});

export const userName = style({
	margin: 0,
	color: "var(--color-text)",
	fontWeight: 700,
});

export const userEmail = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 14,
});

export const message = style({
	margin: 0,
	color: "var(--color-text-muted)",
});

export const error = style({
	margin: 0,
	color: "#a23030",
	fontSize: 14,
});
