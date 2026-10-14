import { style } from "@vanilla-extract/css";

export const root = style({
	display: "flex",
	gap: 0,
	margin: 0,
	padding: 4,
	minWidth: 0,
	border: 0,
	borderRadius: 9999,
	background: "var(--color-surface-muted)",
});

export const option = style({
	flex: 1,
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	gap: 6,
	height: 44,
	padding: "0 4px",
	border: "1.5px solid transparent",
	borderRadius: 9999,
	background: "transparent",
	color: "var(--color-text-muted)",
	font: "inherit",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-medium)",
	cursor: "pointer",
	WebkitTapHighlightColor: "transparent",
	transition: `background-color var(--duration-fast) var(--ease-standard)`,

	selectors: {
		'&[aria-pressed="true"]': {
			background: "var(--color-surface)",
			borderColor: "var(--color-text)",
			color: "var(--color-text)",
			fontWeight: "var(--font-weight-semibold)",
			boxShadow: "var(--shadow-sm)",
		},
		'&[aria-pressed="false"]:hover:not(:disabled)': {
			color: "var(--color-text)",
		},
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});
