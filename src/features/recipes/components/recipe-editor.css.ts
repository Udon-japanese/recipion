import { style } from "@vanilla-extract/css";

export const container = style({
	width: "min(100% - 32px, 1280px)",
	marginInline: "auto",
	paddingBlock: 16,
	color: "var(--color-text)",
});

export const eyebrow = style({
	margin: "0 0 4px",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
});

export const title = style({
	position: "relative",
	margin: 0,
	fontSize: "var(--font-size-2xl)",
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: "var(--line-height-tight)",
	borderRadius: 12,
	transition: "background-color var(--duration-fast) var(--ease-standard)",
	selectors: {
		"&:hover": { background: "var(--color-surface-muted)" },
	},
});

const titleBase = {
	display: "block",
	boxSizing: "border-box",
	width: "100%",
	minHeight: 44,
	padding: "6px 44px 6px 10px",
	textAlign: "left",
	font: "inherit",
	background: "transparent",
	border: "none",
	borderRadius: 12,
	cursor: "text",
} as const;

export const titleButton = style({
	...titleBase,
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const titlePlaceholder = style({
	...titleBase,
	color: "var(--color-text-muted)",
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

// 編集できることを示す鉛筆（押せるのは、左の文字のボタン）。
export const titleEditIcon = style({
	position: "absolute",
	top: "50%",
	right: 12,
	display: "grid",
	color: "var(--color-text-muted)",
	transform: "translateY(-50%)",
	pointerEvents: "none",
});

export const titleInput = style({
	...titleBase,
	padding: "6px 10px",
	background: "var(--color-surface)",
	border: "1.5px solid var(--color-control-border)",
	outline: "none",
	fontSize: "var(--font-size-2xl)",
	fontWeight: "var(--font-weight-extrabold)",
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const metaRow = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 12,
});

export const metaField = style({ width: 140 });

export const metaFieldWide = style({ flex: 1, minWidth: 220 });

const wideScreen = "screen and (min-width: 900px)";

export const tabList = style({
	display: "flex",
	gap: 4,
	padding: 4,
	background: "var(--color-surface-muted)",
	borderRadius: "var(--radius-control)",
	"@media": { [wideScreen]: { display: "none" } },
});

export const tab = style({
	flex: 1,
	minHeight: 44,
	color: "var(--color-text)",
	font: "inherit",
	fontWeight: "var(--font-weight-semibold)",
	background: "transparent",
	border: "1.5px solid transparent",
	borderRadius: "var(--radius-control)",
	cursor: "pointer",
	selectors: {
		'&[aria-selected="true"]': {
			background: "var(--color-primary-soft)",
			borderColor: "var(--color-text)",
		},
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

// 狭い画面では、選んだ方だけを出す。広い画面では、左に入力、右にプレビューを並べる。
export const panes = style({
	display: "grid",
	gap: 16,
	"@media": {
		[wideScreen]: {
			gridTemplateColumns: "minmax(0, 5fr) minmax(0, 6fr)",
			alignItems: "start",
		},
	},
});

export const pane = style({
	display: "grid",
	gap: 12,
	selectors: {
		'&[data-active="false"]': { display: "none" },
	},
	"@media": {
		[wideScreen]: {
			selectors: { '&[data-active="false"]': { display: "grid" } },
		},
	},
});

export const bodyTextarea = style({
	boxSizing: "border-box",
	minHeight: 420,
	padding: 16,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1.5px solid var(--color-control-border)",
	borderRadius: "var(--radius-card)",
	font: "inherit",
	lineHeight: "var(--line-height-relaxed)",
	resize: "vertical",
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const checkRow = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
});

export const hint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const note = style({
	whiteSpace: "pre-wrap",
});

export const unclassified = style({
	display: "grid",
	gap: 6,
	padding: 12,
	border: "1.5px dashed var(--color-control-border)",
	borderRadius: 12,
});

export const form = style({
	display: "grid",
	gap: 16,
});

export const field = style({
	display: "grid",
	gap: 6,
	fontWeight: 600,
});

export const input = style({
	boxSizing: "border-box",
	width: "100%",
	minHeight: 44,
	padding: "0 16px",
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1.5px solid var(--color-control-border)",
	borderRadius: "var(--radius-control)",
	font: "inherit",
	selectors: {
		"&::placeholder": { color: "var(--color-text-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const textarea = style({
	minHeight: 110,
	padding: 10,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
	resize: "vertical",
});

export const preview = style({
	display: "grid",
	gap: 8,
	padding: 16,
	background: "var(--color-surface)",
	borderRadius: "var(--radius-card)",
	boxShadow: "var(--shadow-sm)",
	selectors: {
		'&[data-active="false"]': { display: "none" },
	},
	"@media": {
		[wideScreen]: {
			position: "sticky",
			top: 16,
			maxHeight: "calc(100vh - 32px)",
			overflowY: "auto",
			selectors: { '&[data-active="false"]': { display: "grid" } },
		},
	},
});

export const list = style({
	display: "grid",
	gap: 6,
	margin: 0,
	paddingLeft: 24,
	listStyle: "revert",
	whiteSpace: "pre-wrap",
});

export const error = style({
	margin: 0,
	color: "var(--color-error)",
});

export const completionWrap = style({
	position: "relative",
	display: "grid",
	gap: 6,
});

// PC：カーソルの近くに出す、縦の一覧。
export const completionPopup = style({
	position: "absolute",
	zIndex: 10,
	display: "grid",
	gap: 4,
	minWidth: 160,
	maxWidth: "min(360px, 90vw)",
	padding: 6,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border-strong)",
	borderRadius: 12,
	boxShadow: "var(--shadow-md)",
});

export const completionPopupList = style({
	display: "grid",
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const completionPopupItem = style({
	width: "100%",
	padding: "6px 10px",
	textAlign: "left",
	background: "transparent",
	border: "none",
	borderRadius: 6,
	cursor: "pointer",
	selectors: {
		'&[aria-current="true"]': {
			color: "var(--color-on-primary)",
			background: "var(--color-primary)",
		},
	},
});

export const completionPopupHint = style({
	margin: 0,
	padding: "0 4px",
	color: "var(--color-text-muted)",
	fontSize: 12,
});

// 候補が出ないときの理由（ユーザーを探している最中・見つからない・失敗）。
export const completionNotice = style({
	display: "block",
	margin: 0,
	padding: "4px 8px",
	color: "var(--color-text-muted)",
	fontSize: 13,
	lineHeight: 1.5,
});

// スマホ：キーボードのすぐ上に固定する、横に並べた帯（横にスクロールできる）。
export const completionBar = style({
	position: "fixed",
	left: 0,
	right: 0,
	zIndex: 20,
	padding: "6px 8px",
	background: "var(--color-surface)",
	borderTop: "1px solid var(--color-border-strong)",
});

export const completionBarList = style({
	display: "flex",
	gap: 6,
	margin: 0,
	padding: 0,
	overflowX: "auto",
	listStyle: "none",
	whiteSpace: "nowrap",
	WebkitOverflowScrolling: "touch",
});

export const completionItem = style({
	flexShrink: 0,
	minHeight: 40,
	padding: "6px 12px",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 18,
	cursor: "pointer",
	selectors: {
		'&[aria-current="true"]': {
			color: "var(--color-on-primary)",
			background: "var(--color-primary)",
			borderColor: "var(--color-primary)",
		},
	},
});

export const insertRecipeLinkButton = style({
	minHeight: 40,
	padding: "6px 16px",
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1.5px solid var(--color-control-border)",
	borderRadius: "var(--radius-control)",
	font: "inherit",
	cursor: "pointer",
});

// 材料のリスト：1枚のカードに、行を並べる。
export const ingredientCard = style({
	margin: 0,
	padding: 0,
	overflow: "hidden",
	listStyle: "none",
	border: "1px solid var(--color-border)",
	borderRadius: "var(--radius-card)",
});

const rowBorder = {
	borderTop: "1px solid var(--color-border)",
} as const;

export const ingredientItem = style({
	listStyle: "none",
	selectors: {
		"&:not(:first-child)": rowBorder,
	},
});

export const ingredientRow = style({
	display: "grid",
	gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.7fr) auto auto",
	alignItems: "center",
	gap: 4,
	padding: "2px 4px 2px 4px",
});

export const linkedName = style({
	padding: "0 12px",
	fontWeight: "var(--font-weight-bold)",
});

// 手直しの印がない行でも、右端の位置がそろうよう、ボタンの幅だけ空ける。
export const rowActionSpace = style({ width: 36 });

export const groupItem = style({
	listStyle: "none",
	selectors: {
		"&:not(:first-child)": rowBorder,
	},
});

export const groupHeader = style({
	display: "flex",
	alignItems: "center",
	gap: 4,
	padding: "2px 8px 2px 4px",
	background: "var(--color-surface-muted)",
});

export const groupName = style({ flex: 1, minWidth: 0 });

export const inferredTag = style({
	flex: "none",
	padding: "2px 8px",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
	border: "1px solid var(--color-border)",
	borderRadius: 999,
});

export const groupChildren = style({
	margin: 0,
	padding: "0 0 0 16px",
	listStyle: "none",
});

export const addItem = style({
	listStyle: "none",
	...rowBorder,
});

export const addTrigger = style({
	display: "flex",
	alignItems: "center",
	gap: 6,
	width: "100%",
	minHeight: 44,
	padding: "0 16px",
	color: "var(--color-text-muted)",
	font: "inherit",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
	textAlign: "left",
	background: "transparent",
	border: "none",
	cursor: "pointer",
	selectors: {
		"&:hover": {
			color: "var(--color-text)",
			background: "var(--color-surface-muted)",
		},
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
		},
	},
});

export const addRow = style({
	display: "grid",
	gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.7fr) auto auto",
	alignItems: "center",
	gap: 6,
	padding: 8,
	selectors: {
		'&[data-kind="group"]': {
			gridTemplateColumns: "minmax(0, 1fr) auto auto",
		},
	},
});

export const addActions = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 4,
	marginTop: 4,
});

// 人数：− 数字 ＋。
export const stepper = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 4,
});

export const stepperInput = style({
	boxSizing: "border-box",
	width: 64,
	height: 44,
	padding: 0,
	color: "var(--color-text)",
	font: "inherit",
	fontWeight: "var(--font-weight-bold)",
	textAlign: "center",
	background: "transparent",
	border: "1.5px solid transparent",
	borderRadius: 10,
	MozAppearance: "textfield",
	selectors: {
		"&::-webkit-outer-spin-button": { WebkitAppearance: "none", margin: 0 },
		"&::-webkit-inner-spin-button": { WebkitAppearance: "none", margin: 0 },
		"&:hover": { background: "var(--color-surface-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
			background: "var(--color-surface)",
			borderColor: "var(--color-control-border)",
		},
	},
});
