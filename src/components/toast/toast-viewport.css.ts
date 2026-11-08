import { style } from "@vanilla-extract/css";

// 画面の上に固定する、お知らせの置き場。シート（30）より手前。中央にそろえる。
export const viewport = style({
	position: "fixed",
	top: "calc(env(safe-area-inset-top) + 8px)",
	left: 16,
	right: 16,
	zIndex: 40,
	display: "grid",
	justifyItems: "center",
	gap: 8,
	// 空いたところは、後ろの画面を押せるようにする。
	pointerEvents: "none",
});

export const item = style({
	maxWidth: "100%",
	pointerEvents: "auto",
	// 指の上下の動きを、ページのスクロールにせず、お知らせを動かすのに使う。
	touchAction: "none",
	userSelect: "none",
	willChange: "transform",
	cursor: "grab",
	selectors: {
		'&[data-dragging="true"]': { cursor: "grabbing" },
	},
});
