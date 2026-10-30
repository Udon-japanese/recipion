import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 16,
	minWidth: 0,
});

export const header = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	minHeight: 44,
});

export const title = style({
	flex: 1,
	margin: 0,
	fontSize: "var(--font-size-xl)",
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: 1.3,
});

// 空・ゲスト・確認中：れしぽよと一言。
export const center = style({
	display: "grid",
	justifyItems: "center",
	gap: 12,
	padding: "48px 16px",
	color: "var(--color-text-muted)",
	textAlign: "center",
});

// 見出しの右の主ボタン（広い画面だけ。スマホは右下の＋）。
export const addButton = style({
	display: "none",
	"@media": {
		"(min-width: 768px)": { display: "block" },
	},
});

// 在庫がまだないとき：れしぽよと、追加の入口だけ（枠や地色はつけない）。
export const empty = style({
	display: "grid",
	justifyItems: "center",
	gap: 16,
	padding: "56px 16px",
});

export const loadingText = style({
	margin: "8px 0 0",
	color: "var(--color-text-muted)",
	textAlign: "center",
});

export const srOnly = style({
	position: "absolute",
	width: 1,
	height: 1,
	overflow: "hidden",
	clip: "rect(0 0 0 0)",
	whiteSpace: "nowrap",
});
