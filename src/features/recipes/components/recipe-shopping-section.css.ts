import { style } from "@vanilla-extract/css";

export const container = style({
	width: "min(100% - 32px, 640px)",
	marginInline: "auto",
	marginBottom: 20,
	color: "var(--color-text)",
});

export const openButton = style({
	minHeight: 44,
	paddingInline: 16,
	color: "var(--color-primary-text)",
	background: "var(--color-primary)",
	border: 0,
	borderRadius: 8,
	font: "inherit",
	fontWeight: 700,
	cursor: "pointer",
});

export const panel = style({
	display: "grid",
	gap: 12,
	padding: 12,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 10,
});

export const heading = style({
	margin: 0,
	fontSize: 16,
});

export const hint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 13,
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

export const select = style({
	minHeight: 44,
	paddingInline: 12,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
});

export const list = style({
	display: "grid",
	gap: 8,
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const row = style({
	display: "grid",
	gridTemplateColumns: "auto minmax(0, 1fr)",
	gap: 10,
	alignItems: "start",
	paddingBlock: 8,
	borderTop: "1px solid var(--color-border)",
});

export const sectionHeading = style({
	margin: 0,
	paddingTop: 8,
	borderTop: "1px solid var(--color-border)",
	fontSize: 14,
	fontWeight: 700,
});

export const rowBody = style({
	display: "grid",
	gap: 4,
});

export const rowName = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
	alignItems: "baseline",
	fontWeight: 600,
});

export const amountText = style({
	color: "var(--color-text-muted)",
	fontWeight: 400,
});

export const status = style({
	color: "var(--color-text-muted)",
	fontSize: 13,
});

export const shortStatus = style({
	color: "var(--color-primary)",
	fontSize: 13,
	fontWeight: 600,
});

export const smallButton = style({
	justifySelf: "start",
	minHeight: 32,
	paddingInline: 10,
	color: "var(--color-primary)",
	background: "transparent",
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

export const applyButton = style({
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
