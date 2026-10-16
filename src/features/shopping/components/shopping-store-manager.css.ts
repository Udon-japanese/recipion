import { style } from "@vanilla-extract/css";

export const manager = style({
	background: "var(--color-surface)",
	borderRadius: "var(--radius-card)",
	boxShadow: "var(--shadow-sm)",
});

export const summary = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	minHeight: 48,
	padding: "0 16px",
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-semibold)",
	cursor: "pointer",
	listStyle: "none",
	selectors: {
		"&::-webkit-details-marker": { display: "none" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
			borderRadius: "var(--radius-card)",
		},
	},
});

export const chevron = style({
	display: "grid",
	marginLeft: "auto",
	transition: "transform var(--duration-fast) var(--ease-standard)",
	selectors: {
		"details[open] &": { transform: "rotate(180deg)" },
	},
});

export const list = style({
	margin: 0,
	padding: "0 8px 8px 16px",
	listStyle: "none",
});

export const row = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 8,
	minHeight: 56,
	borderTop: "1px solid var(--color-border)",
});

export const name = style({
	flex: 1,
	minWidth: 0,
	fontWeight: "var(--font-weight-semibold)",
});

export const grow = style({
	flex: 1,
	minWidth: 160,
});

export const buttons = style({
	display: "flex",
	gap: 8,
});

export const confirm = style({
	flex: 1,
	minWidth: 200,
	fontSize: "var(--font-size-sm)",
	lineHeight: 1.55,
});

// 店の追加の入力（一覧の下）。
export const addRow = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	padding: "8px 12px 12px",
});
