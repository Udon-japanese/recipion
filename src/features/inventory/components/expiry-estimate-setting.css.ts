import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 16,
});

export const note = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const row = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 12,
	width: "100%",
	minHeight: 48,
	padding: "0 16px",
	border: "1.5px solid var(--color-control-border)",
	borderRadius: "var(--radius-control)",
	background: "var(--color-surface)",
	color: "var(--color-text)",
	font: "inherit",
	cursor: "pointer",
	textAlign: "left",
	selectors: {
		"&:hover": { borderColor: "var(--color-text)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const rowLabel = style({
	flex: 1,
	fontWeight: "var(--font-weight-medium)",
});

export const rowValue = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

// 文字だけの入口（画面のじゃまにならない）。
export const quietRow = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 6,
	padding: 0,
	color: "var(--color-text-muted)",
	background: "none",
	border: "none",
	font: "inherit",
	fontSize: "var(--font-size-sm)",
	cursor: "pointer",
	textDecoration: "underline",
	selectors: {
		"&:hover": { color: "var(--color-text)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});
