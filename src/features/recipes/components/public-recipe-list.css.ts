import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 16,
});

export const searchForm = style({
	display: "flex",
	alignItems: "flex-start",
	gap: 8,
});

export const searchField = style({ flex: 1, minWidth: 0 });

export const list = style({
	margin: 0,
	padding: 0,
	listStyle: "none",
});

// 行全体を押せるように、リンクの範囲を行いっぱいに広げる。
export const link = style({
	color: "inherit",
	textDecoration: "none",
	selectors: {
		"&::after": { content: '""', position: "absolute", inset: 0 },
	},
});

export const author = style({
	color: "var(--color-text-muted)",
	fontSize: 14,
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

export const error = style({
	margin: 0,
	color: "var(--color-error)",
});
