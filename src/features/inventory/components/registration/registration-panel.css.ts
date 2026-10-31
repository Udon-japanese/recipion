import { style } from "@vanilla-extract/css";

export const form = style({
	display: "grid",
	gap: 16,
});

export const group = style({
	display: "grid",
	gap: 8,
});

export const groupLabel = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
	fontWeight: "var(--font-weight-bold)",
});

export const unitSelect = style({
	flex: "none",
	width: 120,
});

export const hint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

// 入れたもの（続けて入れているときの手応え。買い物メモの追加と同じ）。
export const added = style({
	margin: 0,
	padding: "10px 14px",
	color: "var(--color-text-muted)",
	background: "var(--color-success-soft)",
	borderRadius: "var(--radius-card)",
	fontSize: "var(--font-size-sm)",
	lineHeight: 1.5,
});

export const addedLabel = style({
	color: "var(--color-text)",
	fontWeight: "var(--font-weight-bold)",
});

export const error = style({
	margin: 0,
	display: "flex",
	alignItems: "center",
	gap: 8,
	color: "var(--color-error)",
	fontSize: "var(--font-size-sm)",
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
