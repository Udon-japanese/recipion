import { style } from "@vanilla-extract/css";

export const stack = style({
	display: "grid",
	gap: 16,
});

export const amountRow = style({
	display: "flex",
	alignItems: "center",
	gap: 12,
	minHeight: 88,
});

export const amount = style({
	margin: 0,
	padding: "4px 8px",
	borderRadius: 12,
	fontSize: 28,
	fontWeight: "var(--font-weight-extrabold)",
	fontVariantNumeric: "tabular-nums",
	lineHeight: 1.2,
	transition: "background var(--duration-slow) var(--ease-standard)",
	selectors: {
		// 量が変わった直後の、短い強調。
		"&[data-flash]": { background: "var(--color-primary-soft)" },
	},
});

// カードの中の、行ボタンの並び。
export const card = style({
	display: "grid",
	overflow: "hidden",
	borderRadius: "var(--radius-card)",
});

export const lotList = style({
	display: "grid",
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const lot = style({
	display: "grid",
	gap: 6,
	padding: "12px 16px",
	selectors: {
		"& + &": { borderTop: "1px solid var(--color-border)" },
	},
});

export const lotLine = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 8,
	fontSize: 14,
});

export const lotName = style({
	fontWeight: 600,
});

export const lotAmount = style({
	marginInlineStart: "auto",
	fontWeight: 700,
	fontVariantNumeric: "tabular-nums",
});

// 内訳の行の「直す」（右に寄せる）。
export const lotButtons = style({
	display: "flex",
	justifyContent: "flex-end",
});

// 「ほかの操作」の行ボタン。
export const rowButton = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 12,
	width: "100%",
	minHeight: 48,
	padding: "0 16px",
	color: "var(--color-text)",
	background: "none",
	border: "none",
	font: "inherit",
	fontSize: 16,
	textAlign: "start",
	cursor: "pointer",
	selectors: {
		"& + &": { borderTop: "1px solid var(--color-border)" },
		"&:hover": { background: "var(--color-surface-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
		},
		'&[aria-disabled="true"]': { color: "var(--color-text-disabled)" },
		'&[data-danger="true"]': { color: "var(--color-error)" },
	},
});

export const dangerCard = style({ marginTop: 0 });

export const formStack = style({
	display: "grid",
	gap: 16,
	paddingTop: 8,
});

export const quantityLine = style({
	display: "flex",
	alignItems: "flex-start",
	gap: 8,
});

export const unitSuffix = style({
	flex: "none",
	paddingTop: 12,
	fontWeight: 600,
});

export const checkLine = style({
	display: "flex",
	alignItems: "center",
	gap: 12,
	minHeight: "var(--size-tap)",
	fontSize: 16,
});

export const subLabel = style({
	margin: 0,
	fontSize: 14,
	fontWeight: 600,
});

export const lotFieldList = style({
	display: "grid",
	gap: 12,
});

export const bar = style({
	display: "grid",
	flex: 1,
	gap: 12,
	selectors: {
		'&[data-columns="2"]': { gridTemplateColumns: "1fr 1.5fr" },
		'&[data-columns="3"]': { gridTemplateColumns: "1fr 1fr 1.5fr" },
	},
});

export const counter = style({
	justifySelf: "end",
	margin: 0,
	fontSize: 13,
	color: "var(--color-text-muted)",
});

// 「使った」「買い足した」の2つのボタン。
export const primaryActions = style({
	display: "grid",
	gridTemplateColumns: "1fr 1fr",
	gap: 8,
});

// 内訳の1行を、その場で直すところ。
export const lotEditor = style({
	display: "grid",
	gap: 12,
	paddingTop: 8,
});

export const lotField = style({
	display: "grid",
	gap: 6,
});

export const lotFieldLabel = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
});

export const lotQuantityLine = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
});

export const lotQuantityInput = style({
	width: 140,
});

export const lotEditorActions = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "flex-end",
	gap: 8,
});

// 「期限の種類・初期値」（文字だけのボタン。左に寄せる）。
export const lotDetailsButton = style({
	marginInlineEnd: "auto",
	minHeight: 44,
	padding: 0,
	color: "var(--color-text-muted)",
	background: "none",
	border: "none",
	font: "inherit",
	fontSize: "var(--font-size-sm)",
	textDecoration: "underline",
	cursor: "pointer",
	selectors: {
		"&:hover": { color: "var(--color-text)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});
