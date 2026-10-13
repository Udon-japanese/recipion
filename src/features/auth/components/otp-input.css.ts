import { style } from "@vanilla-extract/css";

// fieldset の既定の枠・余白を消す（意味づけのためだけに使う）。
export const fieldset = style({
	margin: 0,
	padding: 0,
	border: 0,
	minInlineSize: 0,
});

// 見た目の枠と、その上に重ねる本物の入力欄の、基準。
export const root = style({
	position: "relative",
	maxWidth: 360,
});

export const group = style({
	display: "grid",
	gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
	gap: 8,
});

// 見た目だけの枠（本物の入力欄は、その上に、透明で重なっている）。
export const box = style({
	display: "grid",
	placeItems: "center",
	minWidth: 0,
	minHeight: 56,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	fontSize: 24,
	fontWeight: 700,
});

// 入力中の桁（次に入る桁）。
export const boxActive = style({
	outline: "3px solid var(--color-focus)",
	borderColor: "var(--color-primary)",
});

export const boxInvalid = style({
	borderColor: "var(--color-error)",
});

export const boxDisabled = style({
	opacity: 0.6,
});

// 本物の入力欄。透明にして、枠の全体に重ねる（クリックや貼り付けが、そのまま使える）。
// 文字の大きさは、スマホで拡大されないよう、16px 以上にする。
export const input = style({
	position: "absolute",
	inset: 0,
	width: "100%",
	height: "100%",
	margin: 0,
	padding: 0,
	border: 0,
	opacity: 0,
	fontSize: 24,
	cursor: "text",
});
