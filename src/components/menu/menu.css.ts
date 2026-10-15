import { style } from "@vanilla-extract/css";

export const popup = style({
	position: "fixed",
	zIndex: 30,
	boxSizing: "border-box",
	minWidth: 216,
	width: "fit-content",
	display: "flex",
	flexDirection: "column",
	padding: 4,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 16,
	boxShadow: "var(--shadow-md)",
});

export const item = style({
	display: "flex",
	alignItems: "center",
	gap: 12,
	height: 48,
	padding: "0 16px",
	border: 0,
	borderRadius: 12,
	background: "transparent",
	color: "var(--color-text)",
	font: "inherit",
	fontSize: 16,
	fontWeight: "var(--font-weight-medium)",
	textAlign: "left",
	cursor: "pointer",

	selectors: {
		"&:hover:not([aria-disabled='true'])": {
			background: "var(--color-surface-muted)",
		},
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
		},
		'&[data-tone="danger"]': {
			color: "var(--color-error)",
			fontWeight: "var(--font-weight-semibold)",
		},
		"&[aria-disabled='true']": {
			color: "var(--color-text-disabled)",
			cursor: "not-allowed",
		},
	},
});
