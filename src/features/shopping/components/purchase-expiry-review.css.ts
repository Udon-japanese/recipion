import { style } from "@vanilla-extract/css";

export const container = style({
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

export const hint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 13,
});

export const list = style({
	display: "grid",
	gap: 12,
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const item = style({
	display: "grid",
	gap: 8,
	paddingBlock: 8,
	borderTop: "1px solid var(--color-border)",
});

export const itemName = style({
	color: "var(--color-text)",
	fontWeight: 600,
});

export const actions = style({
	display: "flex",
	flexWrap: "wrap",
	justifyContent: "flex-end",
	gap: 8,
});

export const cancelButton = style({
	minHeight: 40,
	paddingInline: 14,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
	cursor: "pointer",
});

export const confirmButton = style({
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
