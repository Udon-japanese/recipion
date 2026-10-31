import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 16,
});

export const estimateNote = style({
	display: "flex",
	alignItems: "flex-start",
	gap: 8,
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const group = style({
	display: "grid",
	gap: 8,
});

export const groupLabel = style({
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
	lineHeight: "var(--line-height-tight)",
});

// 保存方法・期限の種類の、たたんだ行（買い物メモのカテゴリの行と同じ形）。行のどこを押しても開く。
export const detailsToggle = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 8,
	width: "100%",
	minHeight: 44,
	padding: "6px 14px",
	color: "var(--color-text)",
	background: "var(--color-surface-muted)",
	border: "none",
	borderRadius: "var(--radius-card)",
	font: "inherit",
	textAlign: "start",
	cursor: "pointer",
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const detailsTitle = style({
	flex: "none",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
	fontWeight: "var(--font-weight-bold)",
});

export const detailsSummary = style({
	flex: 1,
	minWidth: 0,
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
});

export const detailsAction = style({
	flex: "none",
	color: "var(--color-accent-text)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
});

export const details = style({
	display: "grid",
	gap: 16,
});
