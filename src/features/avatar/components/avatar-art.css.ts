import { style } from "@vanilla-extract/css";

// 丸く切り抜く。
export const frame = style({
	display: "inline-grid",
	flex: "none",
	overflow: "hidden",
	borderRadius: "50%",
	lineHeight: 0,
});
