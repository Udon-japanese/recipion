import { style } from "@vanilla-extract/css";

export const form = style({
	display: "grid",
	gap: 16,
});

export const group = style({
	display: "grid",
	gap: 8,
	minWidth: 0,
	margin: 0,
	padding: 0,
	border: 0,
});

export const groupLabel = style({
	padding: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
	fontWeight: "var(--font-weight-bold)",
});

export const chips = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
});

// 入力欄は1行を使い、ボタンは、その下に並べる（スマホの狭い幅で、重ならない）。
export const newStore = style({
	display: "grid",
	gap: 8,
});

export const newStoreButtons = style({
	display: "flex",
	gap: 8,
});

// カテゴリ：名前から自動で決まるので、小さな1行にする（間違っているときだけ、変える）。
export const category = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	minHeight: 44,
	padding: "6px 8px 6px 14px",
	background: "var(--color-surface-muted)",
	borderRadius: "var(--radius-card)",
	fontSize: "var(--font-size-sm)",
});

export const categoryKey = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
	fontWeight: "var(--font-weight-bold)",
});

export const categoryValue = style({
	flex: 1,
	minWidth: 0,
	fontWeight: "var(--font-weight-bold)",
});

export const auto = style({
	padding: "1px 8px",
	color: "var(--color-accent-text)",
	background: "var(--color-primary-soft)",
	borderRadius: 9999,
	fontSize: "var(--font-size-xs)",
	fontWeight: "var(--font-weight-bold)",
});

// 入れたもの（続けて入れているときの手応え）。
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
