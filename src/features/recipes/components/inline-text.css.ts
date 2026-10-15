import { style } from "@vanilla-extract/css";

const base = {
	boxSizing: "border-box",
	display: "block",
	width: "100%",
	minHeight: 44,
	padding: "0 12px",
	font: "inherit",
	borderRadius: 10,
} as const;

export const button = style({
	...base,
	color: "var(--color-text)",
	textAlign: "left",
	background: "transparent",
	border: "none",
	cursor: "text",
	overflowWrap: "anywhere",
	transition: "background-color var(--duration-fast) var(--ease-standard)",
	selectors: {
		'&[data-align="end"]': { textAlign: "right" },
		'&[data-weight="strong"]': { fontWeight: "var(--font-weight-bold)" },
		'&[data-empty="true"]': { color: "var(--color-text-muted)" },
		"&:hover": { background: "var(--color-surface-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const input = style({
	...base,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1.5px solid var(--color-control-border)",
	selectors: {
		'&[data-align="end"]': { textAlign: "right" },
		'&[data-weight="strong"]': { fontWeight: "var(--font-weight-bold)" },
		"&::placeholder": { color: "var(--color-text-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});
