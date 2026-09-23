import { style } from "@vanilla-extract/css";

export const container = style({
	width: "min(100% - 32px, 640px)",
	marginInline: "auto",
	paddingBlock: 24,
});

export const header = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 16,
	marginBottom: 16,
});

export const title = style({
	margin: 0,
	color: "var(--color-text)",
	fontSize: 24,
});

export const reloadButton = style({
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
		"&:disabled": {
			cursor: "not-allowed",
			opacity: 0.5,
		},

		"&:focus-visible": {
			outline: "3px solid var(--color-primary-soft)",
			outlineOffset: 2,
		},
	},
});

export const message = style({
	margin: 0,
	color: "var(--color-text-muted)",
});

export const error = style({
	margin: 0,
	color: "#a23030",
});

export const list = style({
	display: "grid",
	gap: 8,
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const item = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 16,
	minHeight: 52,
	padding: 12,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 10,
});

export const itemName = style({
	minWidth: 0,
	color: "var(--color-text)",
	overflowWrap: "anywhere",
});

export const quantity = style({
	flexShrink: 0,
	color: "var(--color-text)",
	fontWeight: 700,
});
