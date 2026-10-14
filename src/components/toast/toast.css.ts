import { style } from "@vanilla-extract/css";

export const toast = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 12,
	padding: "8px 8px 8px 16px",
	borderRadius: 9999,
	background: "var(--color-text)",
	color: "var(--color-surface)",
	fontSize: "var(--font-size-sm)",
	boxShadow: "var(--shadow-md)",
});

export const action = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 4,
	height: 36,
	padding: "0 14px",
	border: "1.5px solid var(--color-surface)",
	borderRadius: 9999,
	background: "transparent",
	color: "var(--color-surface)",
	font: "inherit",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
	cursor: "pointer",
	position: "relative",

	selectors: {
		"&::before": { content: '""', position: "absolute", inset: -4 },
		"&:hover": { background: "rgba(255, 255, 255, 0.12)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-surface)",
			outlineOffset: 2,
		},
	},
});
