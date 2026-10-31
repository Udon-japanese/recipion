import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 8,
});

export const hint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const list = style({
	display: "grid",
	margin: 0,
	padding: 0,
	listStyle: "none",
});

// 商品どうしは、細い線と、たっぷりの余白で分ける（枠も、色の面も付けない）。
export const item = style({
	display: "grid",
	gap: 14,
	padding: "20px 0",
	borderTop: "1px solid var(--color-border)",
});

export const itemHead = style({
	display: "flex",
	alignItems: "baseline",
	flexWrap: "wrap",
	gap: "2px 12px",
});

export const itemName = style({
	margin: 0,
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-bold)",
	overflowWrap: "anywhere",
});

export const bought = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const quantity = style({
	display: "grid",
	gap: 10,
});

export const result = style({
	margin: 0,
	fontSize: "var(--font-size-md)",
});

export const askLine = style({
	display: "flex",
	alignItems: "center",
	flexWrap: "wrap",
	gap: 8,
});

export const askWord = style({
	fontSize: "var(--font-size-md)",
});

export const numberInput = style({
	width: 110,
	flex: "none",
});

export const unitSelect = style({
	width: 150,
	flex: "none",
});

// 「その他」の単位を書く欄。書き込みの例（束、玉など）が、切れない幅にする。
export const labelInput = style({
	width: 170,
	flex: "none",
});

export const total = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-md)",
});

export const rowMenu = style({
	marginInlineStart: "auto",
});

export const rowError = style({
	margin: 0,
	color: "var(--color-error)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
});

export const actions = style({
	display: "flex",
	gap: 8,
	width: "100%",
	justifyContent: "flex-end",
});
