import { style } from "@vanilla-extract/css";

export const form = style({
	display: "grid",
	gap: 20,
});

export const fieldGroup = style({
	display: "grid",
	gap: 8,
});

export const label = style({
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
});

export const quantityLine = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
});

export const unitSuffix = style({
	flex: "none",
	color: "var(--color-text-muted)",
});

export const hint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 14,
	lineHeight: 1.6,
});

export const presetList = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
});

// 期限・保存方法の、たたむ行（52px）。たたんでいても、入っている内容が分かる。
export const expiryRow = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 8,
	width: "100%",
	minHeight: 52,
	padding: "0 8px 0 14px",
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1.5px solid var(--color-control-border)",
	borderRadius: 16,
	font: "inherit",
	textAlign: "start",
	cursor: "pointer",
	selectors: {
		"&:hover": { borderColor: "var(--color-border-strong)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const expiryTitle = style({
	flex: "none",
	fontWeight: "var(--font-weight-bold)",
});

export const expirySummary = style({
	flex: 1,
	minWidth: 0,
	color: "var(--color-text-muted)",
	fontSize: 14,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
});

export const chevron = style({
	flex: "none",
	display: "grid",
	placeItems: "center",
	width: 28,
	height: 28,
	transition: "transform var(--duration-fast) var(--ease-standard)",
	selectors: {
		'[aria-expanded="true"] > &': { transform: "rotate(180deg)" },
	},
});

export const expiryBlock = style({
	display: "grid",
	gap: 8,
});

export const expiryHeader = style({
	display: "flex",
	alignItems: "center",
	gap: 4,
});

export const expiryBody = style({
	padding: "4px 2px 0",
});

// 下に固定する操作バー（結果の文・失敗の文の下に、2つのボタン）。
export const footer = style({
	display: "grid",
	gap: 8,
});

export const result = style({
	margin: 0,
	color: "var(--color-text)",
	fontSize: 14,
});

export const error = style({
	margin: 0,
	color: "var(--color-error)",
	fontSize: 14,
});

export const bar = style({
	display: "grid",
	gridTemplateColumns: "1fr 1.5fr",
	gap: 12,
});

// 右下の「在庫に追加」（スマホ）。下部ナビ（64px）の上 16px。
export const fab = style({
	position: "fixed",
	right: 16,
	bottom: "calc(64px + 16px + env(safe-area-inset-bottom))",
	zIndex: 9,
	display: "grid",
	placeItems: "center",
	width: 56,
	height: 56,
	padding: 0,
	color: "var(--color-on-primary)",
	background: "var(--color-primary)",
	border: "none",
	borderRadius: "50%",
	boxShadow: "var(--shadow-md)",
	cursor: "pointer",
	transition: "transform var(--duration-fast) var(--ease-standard)",
	selectors: {
		"&:active": { transform: "scale(0.94)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 3,
		},
	},
	"@media": {
		// 広い画面では、タイトルの行の主ボタンを使う。
		"(min-width: 768px)": { display: "none" },
	},
});

export const srOnly = style({
	position: "absolute",
	width: 1,
	height: 1,
	overflow: "hidden",
	clip: "rect(0 0 0 0)",
	whiteSpace: "nowrap",
});
