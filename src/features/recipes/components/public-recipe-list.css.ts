import { style } from "@vanilla-extract/css";

// カードの列の数は、この欄の幅で決める（public-recipe-card.css.ts の grid）。
export const container = style({
	display: "grid",
	gap: 16,
	containerType: "inline-size",
});

export const searchForm = style({
	display: "flex",
	alignItems: "flex-start",
	gap: 8,
});

export const searchField = style({ flex: 1, minWidth: 0 });

export const empty = style({
	display: "grid",
	justifyItems: "center",
	gap: 12,
	padding: "32px 16px",
	color: "var(--color-text-muted)",
	textAlign: "center",
});

export const emptyText = style({ margin: 0 });

export const error = style({
	margin: 0,
	color: "var(--color-error)",
});

// 検索欄と、タグの絞り込み。
export const search = style({ display: "grid", gap: 12 });

export const tagSheetBody = style({
	display: "grid",
	gap: 12,
});

export const tagSheetHint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});
