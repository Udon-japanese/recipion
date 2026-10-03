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
	display: "grid",
	gap: 12,
	minHeight: 52,
	padding: 12,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 10,
});

export const itemSummary = style({
	display: "grid",
	gridTemplateColumns: "minmax(0, 1fr) auto auto",
	alignItems: "center",
	gap: 12,
});

export const adjustButton = style({
	minHeight: 40,
	paddingInline: 12,
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

export const adjustmentForm = style({
	display: "grid",
	gap: 12,
	paddingTop: 12,
	borderTop: "1px solid var(--color-border)",
});

export const adjustmentField = style({
	display: "grid",
	gap: 6,
});

export const adjustmentLabel = style({
	color: "var(--color-text-muted)",
	fontSize: 14,
	fontWeight: 600,
});

export const quantityInput = style({
	display: "grid",
	gridTemplateColumns: "minmax(0, 1fr) auto",
	alignItems: "center",
	gap: 8,
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

export const adjustmentActions = style({
	display: "flex",
	flexWrap: "wrap",
	justifyContent: "flex-end",
	gap: 8,
});

export const cancelButton = style({
	minHeight: 40,
	paddingInline: 12,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
	cursor: "pointer",
});

export const decreaseButton = style({
	minHeight: 40,
	paddingInline: 12,
	color: "#a23030",
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

export const increaseButton = style({
	minHeight: 40,
	paddingInline: 12,
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
