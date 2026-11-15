import { style } from "@vanilla-extract/css";

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
