import { style } from "@vanilla-extract/css";

const trigger = {
	display: "inline-flex",
	alignItems: "center",
	gap: 8,
	minHeight: 44,
	color: "var(--color-text)",
	font: "inherit",
	cursor: "pointer",
} as const;

// 庫内の見出し（「冷蔵室（1） ▾」）。見出しの文字のまま、押せる。
export const headingTrigger = style({
	...trigger,
	padding: "0 8px",
	background: "none",
	border: "none",
	borderRadius: 12,
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-bold)",
	selectors: {
		"&:hover": { background: "var(--color-surface-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

// 一覧の上の欄（「場所　冷蔵室（1） ▾」）。入力欄と同じ見た目。
export const fieldTrigger = style({
	...trigger,
	boxSizing: "border-box",
	width: "100%",
	padding: "0 16px",
	background: "var(--color-surface)",
	border: "1.5px solid var(--color-control-border)",
	borderRadius: 24,
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const fieldLabel = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const triggerText = style({
	fontWeight: "var(--font-weight-bold)",
});

export const triggerCount = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-regular)",
	marginInlineEnd: "auto",
});

export const list = style({
	display: "grid",
	gap: 2,
});

export const option = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 12,
	width: "100%",
	minHeight: 52,
	padding: "0 16px",
	color: "var(--color-text)",
	background: "none",
	border: "none",
	borderRadius: 14,
	font: "inherit",
	textAlign: "start",
	cursor: "pointer",
	selectors: {
		"&:hover": { background: "var(--color-surface-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
		},
		'&[aria-current="true"]': {
			background: "var(--color-primary-soft)",
			fontWeight: "var(--font-weight-bold)",
		},
	},
});

export const optionIcon = style({
	display: "grid",
	placeItems: "center",
	width: 24,
	height: 24,
	flex: "none",
});

export const optionLabel = style({
	flex: 1,
});

export const optionCount = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});
