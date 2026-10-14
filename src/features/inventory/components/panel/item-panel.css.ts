import { style } from "@vanilla-extract/css";

// 食材のパネル（PC の固定。スマホ・狭い PC は、シートの中に同じ中身を入れる）。
export const fixed = style({
	boxSizing: "border-box",
	position: "sticky",
	top: 24,
	display: "flex",
	flexDirection: "column",
	width: 400,
	maxHeight: "calc(100dvh - 48px)",
	overflow: "hidden",
	background: "var(--color-surface)",
	borderRadius: "var(--radius-dialog)",
	boxShadow: "var(--shadow-md)",
	color: "var(--color-text)",
});

export const fixedHeader = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	flex: "none",
	minHeight: 56,
	padding: "0 6px 0 20px",
});

export const fixedTitle = style({
	flex: 1,
	minWidth: 0,
	margin: 0,
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-bold)",
	lineHeight: 1.3,
	outline: "none",
});

export const fixedBody = style({
	flex: 1,
	minHeight: 0,
	padding: "8px 16px 16px",
	overflowY: "auto",
	overscrollBehavior: "contain",
});

export const fixedFooter = style({
	display: "flex",
	flex: "none",
	gap: 12,
	padding: 12,
	borderTop: "1px solid var(--color-border)",
});

// 何も開いていない PC のパネルの場所（冷蔵庫の位置がずれないよう、幅だけ確保する）。
export const placeholder = style({
	display: "grid",
	placeItems: "center",
	width: 400,
	minHeight: 240,
});

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

export const lotButtons = style({
	display: "grid",
	gridTemplateColumns: "1fr 1fr",
	gap: 8,
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
