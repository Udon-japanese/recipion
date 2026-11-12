import { style } from "@vanilla-extract/css";
import { fabRoom } from "#/components/fab/fab.css";

export const container = style({
	display: "grid",
	alignContent: "start",
	gap: 16,
	width: "min(100% - 32px, 720px)",
	marginInline: "auto",
	paddingBlock: 16,
	color: "var(--color-text)",
	"@media": {
		// スマホ：一番下まで送ったとき、最後のカード・行が、右下の＋（レシピを登録）に隠れないよう空ける。
		"(max-width: 767px)": { paddingBottom: 16 + fabRoom },
	},
});

// 広い画面だけで出すもの（スマホは、右下の＋）。
export const wideOnly = style({
	display: "none",
	"@media": { "(min-width: 768px)": { display: "block" } },
});

export const titleRow = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 12,
});

export const titleActions = style({
	display: "flex",
	flexWrap: "wrap",
	justifyContent: "flex-end",
	gap: 8,
});

// つくった記録の、レシピへ戻るリンク（題名の上）。ボタンの余白の分だけ左へ寄せ、題名と左をそろえる。
export const backRow = style({
	display: "flex",
	marginBottom: -8,
	marginLeft: -12,
});

export const title = style({
	flexShrink: 0,
	margin: 0,
	whiteSpace: "nowrap",
	fontSize: "var(--font-size-xl)",
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: "var(--line-height-tight)",
});

export const list = style({
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const empty = style({
	display: "grid",
	justifyItems: "center",
	gap: 12,
	padding: "32px 16px",
	color: "var(--color-text-muted)",
	textAlign: "center",
});

export const emptyText = style({ margin: 0 });

// 検索欄と、タグの絞り込みのチップ。
export const search = style({ display: "grid", gap: 12 });
