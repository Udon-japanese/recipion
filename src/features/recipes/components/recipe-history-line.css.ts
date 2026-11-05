import { style } from "@vanilla-extract/css";

// 見出しの下の小さな行（作者・公開範囲の並びの、次の行に出す）。
export const line = style({
	display: "flex",
	flexBasis: "100%",
	flexWrap: "wrap",
	columnGap: 12,
	rowGap: 2,
	margin: 0,
});

export const item = style({
	whiteSpace: "nowrap",
});
