import { style } from "@vanilla-extract/css";

// 料理の絵の枠（絵は飾り）。
export const thumbnail = style({
	display: "grid",
	flexShrink: 0,
	overflow: "hidden",
	borderRadius: 12,
	background: "var(--color-primary-soft)",
});
