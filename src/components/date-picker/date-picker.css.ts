import { style } from "@vanilla-extract/css";

export const panel = style({
	boxSizing: "border-box",
	display: "grid",
	gap: 8,
	width: "100%",
	maxWidth: 360,
	margin: "0 auto",
});

export const header = style({
	display: "grid",
	gridTemplateColumns: "44px minmax(0, 1fr) 44px",
	alignItems: "center",
});

export const titleButton = style({
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	gap: 4,
	minHeight: 44,
	padding: "0 12px",
	color: "var(--color-text)",
	background: "none",
	border: "none",
	borderRadius: 12,
	font: "inherit",
	fontWeight: "var(--font-weight-bold)",
	cursor: "pointer",
	selectors: {
		"&:hover": { background: "var(--color-surface-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const yearTitle = style({
	textAlign: "center",
	fontWeight: "var(--font-weight-bold)",
});

export const grid = style({
	width: "100%",
	borderCollapse: "collapse",
	tableLayout: "fixed",
});

export const cell = style({
	padding: 1,
	textAlign: "center",
});

export const weekday = style({
	padding: "4px 0",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-regular)",
});

// 日。押す大きさは、44px（指で押せる）。
export const dayButton = style({
	boxSizing: "border-box",
	display: "grid",
	placeItems: "center",
	width: 44,
	height: 44,
	padding: 0,
	color: "var(--color-text)",
	background: "none",
	border: "2px solid transparent",
	borderRadius: "50%",
	font: "inherit",
	cursor: "pointer",
	selectors: {
		"&:hover": { background: "var(--color-surface-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 1,
		},
		'&[aria-current="date"]': { borderColor: "var(--color-border-strong)" },
		"&[data-outside]": { color: "var(--color-text-disabled)" },
		"&[data-selected]": {
			color: "var(--color-text)",
			background: "var(--color-primary-soft)",
			borderColor: "var(--color-text)",
			fontWeight: "var(--font-weight-bold)",
		},
	},
});

export const monthGrid = style({
	display: "grid",
	gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
	gap: 8,
	padding: "4px 0",
});

export const monthButton = style({
	minHeight: 48,
	color: "var(--color-text)",
	background: "none",
	border: "1.5px solid var(--color-control-border)",
	borderRadius: 16,
	font: "inherit",
	cursor: "pointer",
	selectors: {
		"&:hover": { background: "var(--color-surface-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
		'&[aria-current="true"]': {
			background: "var(--color-primary-soft)",
			borderColor: "var(--color-text)",
			fontWeight: "var(--font-weight-bold)",
		},
	},
});

export const footer = style({
	display: "flex",
	justifyContent: "space-between",
	paddingTop: 4,
});

// PC：入力欄と、カレンダーのボタンを並べる。
export const field = style({
	position: "relative",
	display: "flex",
	alignItems: "center",
});

export const fieldInput = style({
	flex: 1,
	minWidth: 0,
});

export const fieldButton = style({
	position: "absolute",
	insetInlineEnd: 4,
});

// スマホ：押すとシートが開く欄（日付の入力欄と同じ見た目）。
export const trigger = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 8,
	width: "100%",
	minHeight: 48,
	padding: "0 16px",
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1.5px solid var(--color-control-border)",
	borderRadius: 24,
	font: "inherit",
	textAlign: "start",
	cursor: "pointer",
	selectors: {
		'&[data-empty="true"]': { color: "var(--color-text-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
		"&:disabled": { opacity: 0.5, cursor: "default" },
	},
});

export const popover = style({
	position: "fixed",
	zIndex: 30,
	overflowY: "auto",
	overscrollBehavior: "contain",
	boxSizing: "border-box",
	padding: 12,
	border: "1.5px solid var(--color-border-strong)",
	borderRadius: 20,
	background: "var(--color-surface)",
	boxShadow: "var(--shadow-md)",
});

export const errorText = style({
	margin: "4px 0 0",
	color: "var(--color-error)",
	fontSize: "var(--font-size-sm)",
});
