import { style } from "@vanilla-extract/css";
import { fab as fabBase, fabCorner } from "#/components/fab/fab.css";

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

// 右下の「在庫に追加」（スマホ。見た目と置き場所は、共通の fab）。
export const fab = style([
	fabBase,
	fabCorner,
	{
		selectors: {
			// おうちの絵の下の床に置くとき：場面（画面の端から 16）の角から、さらに 16 離す。
			"&[data-on-scene]": {
				right: 16 + 16,
				bottom: "calc(64px + 16px + 16px + env(safe-area-inset-bottom))",
			},
		},
	},
]);
