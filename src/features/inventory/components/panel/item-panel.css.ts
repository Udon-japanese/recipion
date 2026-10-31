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

export const lotList = style({
	display: "grid",
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const lot = style({
	display: "grid",
	gap: 8,
	padding: "4px 8px",
	selectors: {
		"& + &": { borderTop: "1px solid var(--color-border)" },
	},
});

// 内訳の1行（押すと、その場で直す欄が開く）。
export const lotButton = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 8,
	width: "100%",
	minHeight: 48,
	padding: "8px",
	color: "var(--color-text)",
	background: "none",
	border: "none",
	borderRadius: 12,
	font: "inherit",
	textAlign: "start",
	cursor: "pointer",
	selectors: {
		"&:hover": { background: "var(--color-surface-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
		},
	},
});

export const lotSummary = style({
	display: "grid",
	flex: 1,
	gap: 4,
	minWidth: 0,
	padding: "8px 0",
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

export const lotEditorActions = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "flex-end",
	gap: 8,
});

// 使った量・買い足した量の欄（パネルの本体）。
export const adjust = style({
	display: "grid",
	gap: 12,
});

// 文字だけのボタン（入れた分ごとに減らす、など）。
export const textButton = style({
	justifySelf: "start",
	minHeight: 44,
	padding: 0,
	color: "var(--color-accent-text)",
	background: "none",
	border: "none",
	font: "inherit",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
	cursor: "pointer",
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});
