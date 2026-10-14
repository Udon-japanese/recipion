import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 16,
	width: "min(100% - 32px, 640px)",
	marginInline: "auto",
	paddingBlock: 24,
	color: "var(--color-text)",
	lineHeight: "var(--line-height-relaxed)",
});

export const header = style({ display: "grid", gap: 8 });

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-2xl)",
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: "var(--line-height-tight)",
	overflowWrap: "anywhere",
});

export const tags = style({ display: "flex", flexWrap: "wrap", gap: 8 });

export const section = style({
	display: "grid",
	gap: 8,
});

export const sectionTitle = style({
	margin: 0,
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-bold)",
});

export const list = style({
	display: "grid",
	gap: 6,
	margin: 0,
	paddingLeft: 24,
	listStyle: "revert",
	whiteSpace: "pre-wrap",
});

export const nestedList = style({
	display: "grid",
	gap: 6,
	marginTop: 6,
	paddingLeft: 24,
	listStyle: "revert",
});

export const ingredientRow = style({
	display: "flex",
	justifyContent: "space-between",
	gap: 16,
});

export const sourceUrl = style({
	overflowWrap: "anywhere",
});

export const note = style({
	margin: 0,
	whiteSpace: "pre-wrap",
});

// 本文の中の、他のレシピへのリンク（押すと、プレビュー）。
export const linkButton = style({
	padding: 0,
	color: "var(--color-accent-text)",
	background: "none",
	border: "none",
	font: "inherit",
	textDecoration: "underline",
	cursor: "pointer",
});

// リンク先が見つからないとき。
export const missingLink = style({
	color: "var(--color-text-muted)",
});

export const linkedRecipe = style({
	display: "grid",
	gap: 4,
	marginTop: 4,
	paddingLeft: 12,
	borderLeft: "2px solid var(--color-border-strong)",
});

export const linkedToggle = style({
	justifySelf: "start",
	padding: 0,
	color: "var(--color-text-muted)",
	background: "none",
	border: 0,
	font: "inherit",
	fontSize: 13,
	cursor: "pointer",
});

export const linkedNote = style({
	margin: "4px 0 0",
	color: "var(--color-text-muted)",
	fontSize: 13,
});
