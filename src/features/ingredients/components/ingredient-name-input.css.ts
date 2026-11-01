import { style } from "@vanilla-extract/css";
import {
	popupFrame,
	popupList,
} from "#/components/completion-menu/completion-menu.css";

export const container = style({
	display: "grid",
});

// 一覧のカードは、レシピの本文の補完と同じ。位置・幅・高さは、ingredient-name-input.tsx で決める（幅は入力欄に合わせる）。
export const popup = style([popupFrame, { boxSizing: "border-box" }]);

// 高さは、カードの高さ（入力欄の上下の余白）で決める。
export const list = style([popupList, { maxHeight: "none" }]);

export const label = style({
	minWidth: 0,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
});
