import { style } from "@vanilla-extract/css";

// 題名の下の1行（作者・公開範囲の並びの、次の行に出す）。
export const line = style({
	display: "flex",
	flexWrap: "wrap",
	flexBasis: "100%",
	gap: 6,
	margin: 0,
	padding: 0,
	listStyle: "none",
});

// 読み上げだけ。
export const hidden = style({
	position: "absolute",
	width: 1,
	height: 1,
	overflow: "hidden",
	clipPath: "inset(50%)",
	whiteSpace: "nowrap",
});
