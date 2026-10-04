import { style } from "@vanilla-extract/css";

export const form = style({
	display: "grid",
	gap: 12,
	marginBottom: 16,
	padding: 12,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 10,
});

export const heading = style({
	margin: 0,
	color: "var(--color-text)",
	fontSize: 16,
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

export const row = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
	gap: 12,
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

export const hint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 13,
});

export const actions = style({
	display: "flex",
	flexWrap: "wrap",
	justifyContent: "flex-end",
	gap: 8,
});

export const availableButton = style({
	minHeight: 40,
	paddingInline: 16,
	color: "var(--color-primary)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
	fontWeight: 600,
	cursor: "pointer",

	selectors: {
		"&:disabled": {
			cursor: "not-allowed",
			opacity: 0.5,
		},
	},
});

export const submitButton = style({
	minHeight: 40,
	paddingInline: 16,
	color: "var(--color-primary-text)",
	background: "var(--color-primary)",
	border: 0,
	borderRadius: 8,
	font: "inherit",
	fontWeight: 700,
	cursor: "pointer",

	selectors: {
		"&:disabled": {
			cursor: "not-allowed",
			opacity: 0.5,
		},
	},
});

export const error = style({
	margin: 0,
	color: "#a23030",
});

export const presets = style({
	display: "grid",
	gap: 6,
	margin: 0,
	padding: 0,
	border: 0,
});

export const presetList = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 6,
});

export const presetButton = style({
	minHeight: 36,
	paddingInline: 12,
	color: "var(--color-primary)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 18,
	font: "inherit",
	fontSize: 14,
	cursor: "pointer",
});
