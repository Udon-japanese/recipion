import { style } from "@vanilla-extract/css";

export const container = style({
	width: "min(100% - 32px, 640px)",
	marginInline: "auto",
	marginBottom: 20,
	color: "var(--color-text)",
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

export const status = style({
	color: "var(--color-text-muted)",
	fontSize: 13,
});

export const smallButton = style({
	justifySelf: "start",
	minHeight: 32,
	paddingInline: 10,
	color: "var(--color-accent-text)",
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

export const error = style({
	margin: 0,
	color: "var(--color-error)",
});
