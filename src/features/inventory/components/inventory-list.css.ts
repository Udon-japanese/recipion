import { globalStyle, style } from "@vanilla-extract/css";

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

// 切り替えは左、ほかの操作は右に寄せる。
globalStyle(`${header} [data-tools]`, { marginInlineStart: "auto" });

// おうちの読み込み中で、れしぽよを隠しているときのお知らせ（画面の上に固定）。
export const loadingNote = style({
	position: "fixed",
	top: "calc(env(safe-area-inset-top) + 12px)",
	left: 16,
	right: 16,
	zIndex: 20,
	// 左右いっぱいに広げる（中身の幅に縮めない）。広い画面では、本文の幅まで。
	maxWidth: 960,
	marginInline: "auto",
	pointerEvents: "none",
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

export const srOnly = style({
	position: "absolute",
	width: 1,
	height: 1,
	overflow: "hidden",
	clip: "rect(0 0 0 0)",
	whiteSpace: "nowrap",
});

// 表示の切り替え（丸いボタンが2つ）。
export const viewToggle = style({
	display: "inline-flex",
	gap: 4,
	margin: 0,
	padding: 4,
	border: 0,
	borderRadius: 9999,
	background: "var(--color-surface)",
	boxShadow: "var(--shadow-sm)",
});

// 設定と更新のボタン（おうちの表示では、絵の上で、白い丸の台に乗る）。
export const tools = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 8,
});
