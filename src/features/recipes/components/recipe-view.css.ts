import { style } from "@vanilla-extract/css";

export const container = style({
	width: "min(100% - 32px, 640px)",
	marginInline: "auto",
	paddingBlock: 24,
	color: "var(--color-text)",
});

export const title = style({
	marginBottom: 8,
	fontSize: 24,
	fontWeight: 700,
});

export const servings = style({
	marginBottom: 20,
	color: "var(--color-text-muted, inherit)",
});

export const section = style({
	display: "grid",
	gap: 8,
	marginBottom: 20,
});

export const sectionTitle = style({
	fontSize: 18,
	fontWeight: 700,
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
	borderLeft: "2px solid var(--color-border)",
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
