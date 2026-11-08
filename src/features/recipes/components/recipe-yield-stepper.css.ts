import { style } from "@vanilla-extract/css";

// 材料の見出しの横に並べる（見出しの量の文字の代わり）。
export const container = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 4,
	minWidth: 0,
});

// 「− 3人分 ＋」をひとつの小さな丸い枠にまとめる。
export const pill = style({
	boxSizing: "border-box",
	display: "inline-flex",
	alignItems: "center",
	height: 36,
	padding: "0 2px",
	background: "var(--color-surface-muted)",
	borderRadius: 999,
});

export const value = style({
	minWidth: 48,
	padding: "0 2px",
	color: "var(--color-text)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
	textAlign: "center",
	whiteSpace: "nowrap",
	fontVariantNumeric: "tabular-nums",
});

// できあがりの数の入力欄。白い小さな枠と濃い文字で、前後の薄い文字（「クッキー」「個」）と分け、打てる所だと分かるようにする。
export const quantityInput = style({
	boxSizing: "content-box",
	minWidth: "1ch",
	margin: "0 3px",
	padding: "3px 6px",
	color: "var(--color-text)",
	font: "inherit",
	fontVariantNumeric: "tabular-nums",
	textAlign: "center",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 6,
	selectors: {
		"&:focus": {
			borderColor: "var(--color-primary)",
			outline: "2px solid var(--color-primary)",
			outlineOffset: 0,
		},
	},
});

// 入力欄の前後の文字は、打てないので薄くする（数のない量の文字だけのときは、value のまま濃い）。
export const editableValue = style({
	color: "var(--color-text-muted)",
});

export const visuallyHidden = style({
	position: "absolute",
	width: 1,
	height: 1,
	margin: -1,
	padding: 0,
	overflow: "hidden",
	clip: "rect(0 0 0 0)",
	whiteSpace: "nowrap",
	border: 0,
});

// 量を変えているとき（元の量と違う）は、枠をやわらかい主色にして、変えていることを分かるようにする。
export const pillChanged = style({
	background: "var(--color-primary-soft)",
});
