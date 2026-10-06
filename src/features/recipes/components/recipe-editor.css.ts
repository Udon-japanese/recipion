import { style } from "@vanilla-extract/css";

export const container = style({
	width: "min(100% - 32px, 1120px)",
	marginInline: "auto",
	paddingBlock: 24,
	color: "var(--color-text)",
});

export const eyebrow = style({
	marginBottom: 4,
	color: "var(--color-text-muted)",
	fontSize: 13,
});

export const title = style({
	margin: 0,
	fontSize: 24,
	fontWeight: 700,
});

const titleBase = {
	display: "block",
	width: "100%",
	minHeight: 44,
	padding: "6px 10px",
	textAlign: "left",
	font: "inherit",
	borderRadius: 8,
	cursor: "text",
} as const;

export const titleButton = style({
	...titleBase,
	selectors: {
		"&:hover": { background: "var(--color-surface-subtle)" },
	},
});

export const titlePlaceholder = style({
	...titleBase,
	color: "var(--color-text-muted)",
	selectors: {
		"&:hover": { background: "var(--color-surface-subtle)" },
	},
});

export const titleInput = style({
	...titleBase,
	background: "var(--color-surface)",
	border: "1px solid var(--color-primary)",
	fontSize: 24,
	fontWeight: 700,
});

export const metaRow = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 12,
});

export const metaField = style({
	display: "grid",
	gap: 6,
	width: 110,
	fontWeight: 600,
});

export const metaFieldWide = style({
	display: "grid",
	flex: 1,
	gap: 6,
	minWidth: 220,
	fontWeight: 600,
});

const wideScreen = "screen and (min-width: 900px)";

export const tabList = style({
	display: "flex",
	gap: 8,
	"@media": { [wideScreen]: { display: "none" } },
});

export const tab = style({
	flex: 1,
	minHeight: 44,
	font: "inherit",
	fontWeight: 600,
	background: "var(--color-surface-subtle)",
	borderRadius: 8,
	cursor: "pointer",
	selectors: {
		'&[aria-selected="true"]': {
			color: "var(--color-primary-text)",
			background: "var(--color-primary)",
		},
	},
});

// 狭い画面では、選んだ方だけを出す。広い画面では、左に入力、右にプレビューを並べる。
export const panes = style({
	display: "grid",
	gap: 16,
	"@media": {
		[wideScreen]: {
			gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
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
	minHeight: 420,
	padding: 10,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
	lineHeight: 1.6,
	resize: "vertical",
});

export const checkRow = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
});

export const hint = style({
	color: "var(--color-text-muted)",
	fontSize: 13,
});

export const editedBadge = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 6,
	fontSize: 12,
	color: "var(--color-primary)",
});

export const linkButton = style({
	font: "inherit",
	textDecoration: "underline",
	cursor: "pointer",
});

export const note = style({
	whiteSpace: "pre-wrap",
});

export const unclassified = style({
	display: "grid",
	gap: 6,
	padding: 12,
	border: "1px dashed var(--color-border)",
	borderRadius: 8,
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
	minHeight: 44,
	padding: 10,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
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
	background: "var(--color-surface-subtle)",
	borderRadius: 8,
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

export const nestedList = style({
	marginTop: 6,
	paddingLeft: 24,
	listStyle: "revert",
});

export const saveButton = style({
	minHeight: 44,
	paddingInline: 18,
	justifySelf: "end",
	color: "var(--color-primary-text)",
	background: "var(--color-primary)",
	borderRadius: 8,
	font: "inherit",
	fontWeight: 700,
	cursor: "pointer",
	selectors: {
		"&:disabled": { opacity: 0.6, cursor: "not-allowed" },
		"&:focus-visible": {
			outline: "3px solid var(--color-primary-soft)",
			outlineOffset: 2,
		},
	},
});

export const error = style({
	color: "#a23030",
});

export const ingredientRow = style({
	display: "grid",
	gridTemplateColumns:
		"minmax(0, 1fr) minmax(100px, 0.7fr) minmax(110px, 0.7fr) auto",
	gap: 8,
});

export const addIngredientRow = style({
	display: "grid",
	gridTemplateColumns: "minmax(0, 1fr) minmax(100px, 0.7fr) auto",
	gap: 8,
});

export const addGroupRow = style({
	display: "grid",
	gridTemplateColumns: "minmax(0, 1fr) auto",
	gap: 8,
});

export const completionWrap = style({
	display: "grid",
	gap: 6,
});

export const completionBox = style({
	display: "grid",
	gap: 4,
});

export const completionList = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 6,
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const completionItem = style({
	minHeight: 36,
	padding: "6px 12px",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 18,
	cursor: "pointer",
	selectors: {
		'&[aria-current="true"]': {
			color: "var(--color-primary-text)",
			background: "var(--color-primary)",
			borderColor: "var(--color-primary)",
		},
	},
});
