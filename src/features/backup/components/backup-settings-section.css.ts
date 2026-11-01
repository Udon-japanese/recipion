import { style } from "@vanilla-extract/css";

export const text = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const block = style({
	display: "grid",
	justifyItems: "start",
	gap: 12,
});

export const blockTitle = style({
	margin: 0,
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-bold)",
});

// ファイルの選択は、見た目のボタンから開く（入力欄そのものは見せない）。
export const fileInput = style({
	position: "absolute",
	width: 1,
	height: 1,
	overflow: "hidden",
	clipPath: "inset(50%)",
	whiteSpace: "nowrap",
});

// 確認のシートの中身。
export const sheetBody = style({
	display: "grid",
	gap: 12,
});

export const sheetText = style({
	margin: 0,
});

export const option = style({
	display: "flex",
	alignItems: "center",
	gap: 4,
	cursor: "pointer",
});

export const optionText = style({
	minWidth: 0,
	overflowWrap: "anywhere",
});
