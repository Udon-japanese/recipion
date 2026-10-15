import { style } from "@vanilla-extract/css";

export const body = style({
	display: "grid",
	gap: 12,
	selectors: {
		// display を指定すると、hidden 属性が効かなくなるので、明示する。
		"&[hidden]": { display: "none" },
	},
});

// 一覧：1枚のカードに、行を並べる。
export const list = style({
	display: "grid",
	margin: 0,
	padding: 0,
	overflow: "hidden",
	listStyle: "none",
	border: "1px solid var(--color-border)",
	borderRadius: "var(--radius-card)",
});

export const item = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 8,
	width: "100%",
	minHeight: 56,
	padding: "8px 16px",
	color: "var(--color-text)",
	font: "inherit",
	fontWeight: "var(--font-weight-medium)",
	textAlign: "left",
	background: "transparent",
	border: "none",
	cursor: "pointer",
	selectors: {
		"li:not(:first-child) > &": { borderTop: "1px solid var(--color-border)" },
		"&:hover": { background: "var(--color-surface-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
		},
	},
});

export const itemText = style({
	flex: 1,
	minWidth: 0,
	overflowWrap: "anywhere",
});

export const message = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 8,
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const hint = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const toolbar = style({
	display: "flex",
	justifyContent: "flex-end",
});
