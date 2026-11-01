import { style } from "@vanilla-extract/css";
import {
	popupItem,
	popupList,
} from "#/components/completion-menu/completion-menu.css";

export const container = style({
	display: "grid",
});

// 一覧は、画面の上に固定して出す（シートや、スクロールする枠の中にあっても、切れないように）。
// 位置・幅・高さは、ingredient-name-input.tsx で決める（幅は入力欄に合わせる）。
// 見た目は、レシピの本文の補完（completion-menu）と同じ。重なりの順も同じ。
export const popup = style({
	position: "fixed",
	zIndex: 40,
	boxSizing: "border-box",
	display: "grid",
	// 高さを縮めるとき（上に置くため）は、一覧が縮んで、中でスクロールする。
	gridTemplateRows: "minmax(0, 1fr) auto",
	gap: 4,
	padding: 4,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 16,
	boxShadow: "var(--shadow-md)",
});

export const list = style([popupList, { maxHeight: "none" }]);

// 選んでいる候補の見た目は、本文の補完（aria-current）と同じにする（こちらは、listbox の aria-selected）。
export const option = style([
	popupItem,
	{
		selectors: {
			'&[aria-selected="true"]': {
				background: "var(--color-primary-soft)",
				fontWeight: "var(--font-weight-bold)",
			},
		},
	},
]);

export const label = style({
	minWidth: 0,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
});
