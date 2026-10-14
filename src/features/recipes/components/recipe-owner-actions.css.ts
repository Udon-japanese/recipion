import { style } from "@vanilla-extract/css";

export const bar = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "flex-end",
	gap: 8,
	width: "min(100% - 32px, 640px)",
	marginInline: "auto",
	marginTop: 16,
});
