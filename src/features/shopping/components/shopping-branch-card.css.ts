import { style } from "@vanilla-extract/css";

// 条件つきのメモ：1枚のカード。全体に、薄い色（端の線は使わない）。
export const card = style({
	boxSizing: "border-box",
	display: "grid",
	borderRadius: "var(--radius-dialog)",
	background: "var(--color-primary-soft)",
	color: "var(--color-text)",
	overflow: "hidden",
});

export const head = style({
	display: "flex",
	alignItems: "flex-start",
	gap: 4,
	padding: "14px 4px 0 16px",
});

export const headText = style({ flex: 1, minWidth: 0, paddingTop: 2 });

export const eyebrow = style({
	display: "flex",
	alignItems: "center",
	gap: 4,
	margin: "0 0 2px",
	color: "var(--color-accent-text)",
	fontSize: "var(--font-size-xs)",
	fontWeight: "var(--font-weight-bold)",
	letterSpacing: "0.04em",
});

export const condition = style({
	margin: 0,
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-bold)",
	lineHeight: "var(--line-height-tight)",
});

export const summary = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 6,
	padding: "10px 16px 0",
});

export const decide = style({
	display: "grid",
	gridTemplateColumns: "1fr 1fr",
	gap: 10,
	padding: "14px 16px",
});

export const toggleButton = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	gap: 4,
	width: "100%",
	minHeight: 44,
	padding: 0,
	border: 0,
	borderTop: "1px solid rgba(41, 39, 32, 0.08)",
	background: "transparent",
	color: "var(--color-accent-text)",
	font: "inherit",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
	cursor: "pointer",

	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
		},
	},
});

export const chevron = style({
	display: "inline-flex",
	transition: "transform var(--duration-fast) var(--ease-standard)",
	selectors: {
		'[aria-expanded="true"] > &': { transform: "rotate(180deg)" },
	},
});

export const detail = style({
	display: "grid",
	gap: 4,
	padding: "4px 16px 14px",
	borderTop: "1px solid rgba(41, 39, 32, 0.08)",
});

export const tabs = style({ paddingTop: 10 });

export const rows = style({
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const row = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	minHeight: 48,
	borderTop: "1px solid rgba(41, 39, 32, 0.08)",
	selectors: { "&:first-child": { borderTop: 0 } },
});

export const rowName = style({
	flex: 1,
	minWidth: 0,
	fontWeight: "var(--font-weight-semibold)",
});

export const rowAmount = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const empty = style({
	margin: 0,
	padding: "12px 0",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const addTrigger = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 6,
	alignSelf: "start",
	justifySelf: "start",
	minHeight: 44,
	padding: "0 16px",
	border: "1.5px dashed var(--color-control-border)",
	borderRadius: "var(--radius-control)",
	background: "transparent",
	color: "var(--color-text)",
	font: "inherit",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
	cursor: "pointer",

	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});
