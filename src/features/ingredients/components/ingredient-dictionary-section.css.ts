import { style } from "@vanilla-extract/css";

export const list = style({
	display: "grid",
	gap: 0,
	margin: 0,
	padding: 0,
	listStyle: "none",
	borderTop: "1px solid var(--color-border)",
});

export const row = style({
	display: "grid",
	gap: 12,
	paddingBlock: 10,
	borderBottom: "1px solid var(--color-border)",
});

export const rowHead = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	minWidth: 0,
});

export const name = style({
	fontWeight: "var(--font-weight-bold)",
	whiteSpace: "nowrap",
});

// 呼び名（一覧の行では、短く並べる）。
export const aliases = style({
	flex: 1,
	minWidth: 0,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const editor = style({
	display: "grid",
	gap: 16,
	paddingBlockEnd: 6,
});

export const nameForm = style({
	display: "grid",
	gap: 6,
});

export const nameRow = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	flexWrap: "wrap",
});

export const message = style({
	margin: 0,
	color: "var(--color-error)",
	fontSize: "var(--font-size-sm)",
});

export const aliasBlock = style({
	display: "grid",
	gap: 8,
});

export const aliasTitle = style({
	margin: 0,
	fontWeight: "var(--font-weight-bold)",
	fontSize: "var(--font-size-sm)",
});

export const aliasList = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 6,
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const alias = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 2,
	paddingInlineStart: 12,
	borderRadius: 999,
	background: "var(--color-surface-muted)",
	fontSize: "var(--font-size-sm)",
});
