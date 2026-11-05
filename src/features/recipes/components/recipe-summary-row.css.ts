import { style } from "@vanilla-extract/css";

// 行全体を押せるように、リンクの範囲を行いっぱいに広げる。
export const link = style({
	color: "inherit",
	textDecoration: "none",
	selectors: {
		"&::after": { content: '""', position: "absolute", inset: 0 },
	},
});

export const author = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 6,
	color: "var(--color-text-muted)",
	fontSize: 14,
});
