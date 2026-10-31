import { style } from "@vanilla-extract/css";

// レシピの詳細画面の枠（本体と、下の操作の幅をそろえる）。
export const page = style({
	display: "grid",
	gap: 24,
	width: "min(100% - 32px, 960px)",
	marginInline: "auto",
	paddingBlock: 24,
});

// 買い物メモに入れる（左）・つくった（右）。狭い画面では、縦に並べる。
export const actions = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
	alignItems: "start",
	gap: 12,
});
