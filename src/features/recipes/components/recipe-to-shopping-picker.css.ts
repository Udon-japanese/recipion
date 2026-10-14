import { style } from "@vanilla-extract/css";

export const list = style({
	display: "grid",
	gap: 16,
});

export const hint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const recipeList = style({
	margin: 0,
	padding: 0,
	listStyle: "none",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: "var(--radius-card)",
	overflow: "hidden",
});

export const recipeRow = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 12,
	width: "100%",
	minHeight: 64,
	padding: "8px 16px",
	border: 0,
	background: "transparent",
	color: "var(--color-text)",
	font: "inherit",
	textAlign: "left",
	cursor: "pointer",
	selectors: {
		"li + li > &": { borderTop: "1px solid var(--color-border)" },
		"&:hover:not(:disabled)": { background: "var(--color-surface-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
		},
		"&:disabled": { cursor: "wait", opacity: 0.6 },
	},
});

export const recipeName = style({
	flex: 1,
	minWidth: 0,
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-medium)",
});

export const footer = style({
	display: "flex",
	gap: 8,
	width: "100%",
});
