import { style } from "@vanilla-extract/css";

export const container = style({
	width: "min(100% - 32px, 640px)",
	marginInline: "auto",
	paddingBlock: 24,
	color: "var(--color-text)",
});

export const title = style({
	marginBottom: 20,
	fontSize: 24,
	fontWeight: 700,
});

export const form = style({
	display: "grid",
	gap: 16,
});

export const field = style({
	display: "grid",
	gap: 6,
	fontWeight: 600,
});

export const input = style({
	minHeight: 44,
	padding: 10,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
});

export const textarea = style({
	minHeight: 110,
	padding: 10,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
	resize: "vertical",
});

export const preview = style({
	display: "grid",
	gap: 8,
	padding: 16,
	background: "var(--color-surface-subtle)",
	borderRadius: 8,
});

export const list = style({
	display: "grid",
	gap: 6,
	margin: 0,
	paddingLeft: 24,
	listStyle: "revert",
	whiteSpace: "pre-wrap",
});

export const nestedList = style({
	marginTop: 6,
	paddingLeft: 24,
	listStyle: "revert",
});

export const saveButton = style({
	minHeight: 44,
	paddingInline: 18,
	justifySelf: "end",
	color: "var(--color-primary-text)",
	background: "var(--color-primary)",
	borderRadius: 8,
	font: "inherit",
	fontWeight: 700,
	cursor: "pointer",
	selectors: {
		"&:disabled": { opacity: 0.6, cursor: "not-allowed" },
		"&:focus-visible": {
			outline: "3px solid var(--color-primary-soft)",
			outlineOffset: 2,
		},
	},
});

export const error = style({
	color: "#a23030",
});

export const ingredientRow = style({
	display: "grid",
	gridTemplateColumns:
		"minmax(0, 1fr) minmax(100px, 0.7fr) minmax(110px, 0.7fr)",
	gap: 8,
});
