import { style } from "@vanilla-extract/css";

// 作り方のカードの一番下：「つくった！」と、その左の調整のボタン。
export const container = style({
	display: "grid",
	gap: 4,
	color: "var(--color-text)",
});

export const madeBar = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "flex-end",
	gap: 8,
});

export const madeNote = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
	textAlign: "right",
});

export const hint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const sheetBody = style({ display: "grid", gap: 12 });

export const list = style({
	display: "grid",
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const row = style({
	display: "grid",
	gap: 8,
	justifyItems: "start",
	paddingBlock: 12,
	borderTop: "1px solid var(--color-border)",
	selectors: { "&:first-child": { borderTop: 0 } },
});

export const status = style({
	color: "var(--color-text)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

// 引いたもの：材料（左）と数量（右）。補足は、下に小さく。
export const amountRow = style({
	display: "grid",
	gridTemplateColumns: "1fr auto",
	columnGap: 12,
	rowGap: 2,
	alignItems: "baseline",
	paddingBlock: 10,
	borderTop: "1px solid var(--color-border)",
	color: "var(--color-text)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
	selectors: { "&:first-child": { borderTop: 0 } },
});

export const amount = style({
	fontWeight: "var(--font-weight-bold)",
	fontVariantNumeric: "tabular-nums",
	textAlign: "right",
});

export const note = style({
	gridColumn: "1 / -1",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
});

// 引かなかったもの：同じ理由の材料を、1か所にまとめる。
export const skippedGroup = style({
	display: "grid",
	gap: 2,
	paddingTop: 12,
	borderTop: "1px solid var(--color-border)",
});

export const skippedLabel = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
	lineHeight: "var(--line-height-normal)",
});

export const skippedNames = style({
	margin: 0,
	color: "var(--color-text)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const footer = style({ display: "grid", gap: 8 });
