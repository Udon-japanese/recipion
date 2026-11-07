import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	alignContent: "start",
	gap: 16,
	width: "min(100% - 32px, 720px)",
	marginInline: "auto",
	paddingBlock: 16,
	color: "var(--color-text)",
});

export const titleRow = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 12,
});

export const title = style({
	margin: 0,
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
