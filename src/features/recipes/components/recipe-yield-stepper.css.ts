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

// 量を変えているとき（元の量と違う）は、枠をやわらかい主色にして、変えていることを分かるようにする。
export const pillChanged = style({
	background: "var(--color-primary-soft)",
});
