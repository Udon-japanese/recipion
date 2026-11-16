import { style } from "@vanilla-extract/css";

// 引いたものの行の下に開く、量を直す欄（行の幅いっぱい）。
export const editor = style({
	gridColumn: "1 / -1",
	display: "grid",
	gap: 8,
	paddingTop: 8,
});

export const actions = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
});

export const unitSuffix = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	whiteSpace: "nowrap",
});
