import { style } from "@vanilla-extract/css";

// レシピの詳細画面の枠。
export const page = style({
	display: "grid",
	gap: 24,
	width: "min(100% - 32px, 960px)",
	marginInline: "auto",
	paddingBlock: 24,
});
