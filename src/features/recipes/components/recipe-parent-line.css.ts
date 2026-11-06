import { style } from "@vanilla-extract/css";

// 題名の下の1行（作者・公開範囲の並びの、次の行に出す）。
export const line = style({
	flexBasis: "100%",
	margin: 0,
});

export const link = style({
	color: "var(--color-text)",
	fontWeight: "var(--font-weight-semibold)",
	textDecoration: "underline",
	textUnderlineOffset: 3,
});
