import { style } from "@vanilla-extract/css";

const tableColumns =
	"minmax(110px, 140px) minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr)";

export const container = style({
	display: "grid",
	gap: 12,
});

export const hint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const settingLine = style({
	display: "flex",
});

// 表の見出し（PC）。
export const tableHead = style({
	display: "grid",
	gridTemplateColumns: tableColumns,
	columnGap: 16,
	padding: "8px 0",
	borderBottom: "1px solid var(--color-border-strong)",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
});

export const group = style({
	display: "grid",
	gap: 4,
});

export const groupTitle = style({
	display: "flex",
	alignItems: "baseline",
	gap: 8,
	margin: "8px 0 0",
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-bold)",
});

export const groupNote = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const list = style({
	display: "grid",
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const row = style({
	display: "grid",
	padding: "14px 0",
	borderBottom: "1px solid var(--color-border)",
	selectors: {
		'&[data-layout="table"]': {
			gridTemplateColumns: tableColumns,
			columnGap: 16,
			alignItems: "start",
		},
		// スマホ：商品ごとのカード。
		'&[data-layout="card"]': {
			gap: 10,
		},
	},
});

export const name = style({
	display: "flex",
	flexDirection: "column",
	gap: 2,
	minWidth: 0,
});

export const itemName = style({
	margin: 0,
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-bold)",
	overflowWrap: "anywhere",
});

export const bought = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

// 1つ分の入力。スマホでは、左にラベルを付ける。
export const cell = style({
	minWidth: 0,
	selectors: {
		[`${row}[data-layout="card"] > &`]: {
			display: "grid",
			gridTemplateColumns: "88px minmax(0, 1fr)",
			alignItems: "start",
			gap: 8,
		},
		[`${row}[data-layout="card"] > &[data-wide]`]: {
			gridTemplateColumns: "minmax(0, 1fr)",
		},
		[`${row}[data-layout="card"] > &[data-wide]::before`]: {
			display: "none",
		},
		[`${row}[data-layout="card"] > &::before`]: {
			content: "attr(data-label)",
			color: "var(--color-text-muted)",
			fontSize: "var(--font-size-sm)",
			fontWeight: "var(--font-weight-semibold)",
			paddingTop: 12,
		},
	},
});

export const result = style({
	margin: 0,
	paddingTop: 8,
	fontSize: "var(--font-size-md)",
});

// 量を教えてほしいところ（やわらかい黄色の地）。
export const askBox = style({
	display: "grid",
	gap: 8,
	padding: 12,
	background: "var(--color-warning-soft)",
	borderRadius: 12,
});

export const askLine = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
});

export const askWord = style({
	fontSize: "var(--font-size-sm)",
	whiteSpace: "nowrap",
});

export const numberInput = style({
	width: 110,
	flex: "none",
});

export const labelInput = style({
	width: 88,
	flex: "none",
});

export const toggleLine = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
});

export const rowError = style({
	margin: 0,
	color: "var(--color-error)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
});

export const expiryCell = style({
	display: "grid",
	gap: 8,
});

export const dateLine = style({
	display: "flex",
	alignItems: "center",
	gap: 2,
});

export const dateButton = style({
	boxSizing: "border-box",
	display: "inline-flex",
	alignItems: "center",
	gap: 6,
	minHeight: 44,
	padding: "0 12px",
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1.5px solid var(--color-control-border)",
	borderRadius: 12,
	font: "inherit",
	whiteSpace: "nowrap",
	cursor: "pointer",
	selectors: {
		'&[data-empty="true"]': { color: "var(--color-text-muted)" },
		"&:hover": { borderColor: "var(--color-border-strong)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
		"&:disabled": { opacity: 0.5, cursor: "default" },
	},
});

export const tag = style({
	padding: "0 6px",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "18px",
	border: "1px solid var(--color-control-border)",
	borderRadius: 4,
	selectors: {
		"&[data-estimated]": { borderStyle: "dashed" },
	},
});

export const clearButton = style({
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	width: 44,
	height: 44,
	padding: 0,
	color: "var(--color-text-muted)",
	background: "none",
	border: "none",
	borderRadius: 8,
	cursor: "pointer",
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const datePicker = style({
	display: "grid",
	gap: 8,
});

export const footer = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 12,
	width: "100%",
	flexWrap: "wrap",
});

export const footNote = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	selectors: {
		"&[data-error]": {
			color: "var(--color-error)",
			fontWeight: "var(--font-weight-bold)",
		},
	},
});

export const actions = style({
	display: "flex",
	gap: 8,
	marginInlineStart: "auto",
});
