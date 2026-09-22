import { style } from "@vanilla-extract/css";

export const container = style({
	width: "min(100% - 32px, 640px)",
	marginInline: "auto",
	paddingBlock: 32,
});

export const title = style({
	marginBlock: "0 24px",
	color: "var(--color-text)",
	fontSize: 28,
	lineHeight: 1.2,
});

export const toolbar = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
	justifyContent: "flex-end",
	marginBlock: "-12px 20px",
});

export const sortButton = style({
	minHeight: 40,
	paddingInline: 14,
	color: "var(--color-primary)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
	fontWeight: 600,
	cursor: "pointer",

	selectors: {
		"&:hover:not(:disabled)": {
			borderColor: "var(--color-primary)",
			background: "var(--color-surface-subtle)",
		},

		"&:disabled": {
			cursor: "not-allowed",
			opacity: 0.5,
		},

		"&:focus-visible": {
			outline: "3px solid var(--color-primary-soft)",
			outlineOffset: 2,
		},
	},
});

export const form = style({
	display: "grid",
	gap: 12,
	marginBottom: 24,
});

export const field = style({
	display: "grid",
	gap: 6,
	minWidth: 0,
});

export const fieldLabel = style({
	color: "var(--color-text-muted)",
	fontSize: 14,
	fontWeight: 600,
});

export const details = style({
	display: "grid",
	gridTemplateColumns: "minmax(96px, 0.4fr) minmax(0, 1fr)",
	gap: 8,
});

export const label = style({
	color: "var(--color-text)",
	fontWeight: 600,
});

export const input = style({
	minWidth: 0,
	minHeight: 44,
	paddingInline: 12,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",

	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-primary-soft)",
			borderColor: "var(--color-primary)",
		},
	},
});

export const presets = style({
	display: "grid",
	gap: 8,
	minWidth: 0,
	margin: 0,
	padding: 0,
	border: 0,
});

export const presetLegend = style({
	marginBottom: 8,
	padding: 0,
	color: "var(--color-text-muted)",
	fontSize: 14,
	fontWeight: 600,
});

export const presetList = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
});

export const presetButton = style({
	minHeight: 40,
	paddingInline: 14,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 999,
	font: "inherit",
	cursor: "pointer",

	selectors: {
		"&:hover": {
			borderColor: "var(--color-primary)",
		},

		"&[aria-pressed='true']": {
			color: "var(--color-primary-text)",
			background: "var(--color-primary)",
			borderColor: "var(--color-primary)",
		},

		"&:focus-visible": {
			outline: "3px solid var(--color-primary-soft)",
			outlineOffset: 2,
		},
	},
});

export const addButton = style({
	minHeight: 44,
	paddingInline: 18,
	color: "var(--color-primary-text)",
	background: "var(--color-primary)",
	border: 0,
	borderRadius: 8,
	font: "inherit",
	fontWeight: 700,
	cursor: "pointer",
	justifySelf: "end",

	selectors: {
		"&:hover": {
			background: "var(--color-primary-hover)",
		},

		"&:disabled": {
			cursor: "not-allowed",
			opacity: 0.6,
		},

		"&:focus-visible": {
			outline: "3px solid var(--color-primary-soft)",
			outlineOffset: 2,
		},
	},
});

export const error = style({
	margin: 0,
	color: "#a23030",
	fontSize: 14,
});

export const message = style({
	color: "var(--color-text-muted)",
});

export const list = style({
	display: "grid",
	gap: 8,
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const item = style({
	display: "grid",
	gridTemplateColumns: "auto 1fr auto",
	alignItems: "center",
	gap: 12,
	minHeight: 52,
	padding: 12,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 10,
});

export const checkedItem = style({
	background: "var(--color-surface-subtle)",
});

export const checkbox = style({
	width: 22,
	height: 22,
	margin: 0,
	accentColor: "var(--color-primary)",
	cursor: "pointer",
});

export const itemName = style({
	color: "var(--color-text)",
	overflowWrap: "anywhere",
});

export const checkedItemName = style({
	color: "var(--color-text-muted)",
	textDecoration: "line-through",
});

export const quantity = style({
	marginLeft: 8,
	color: "var(--color-text-muted)",
	fontSize: 14,
});

export const deleteButton = style({
	minWidth: 44,
	minHeight: 44,
	padding: 8,
	color: "var(--color-text-muted)",
	background: "transparent",
	border: 0,
	borderRadius: 8,
	font: "inherit",
	cursor: "pointer",

	selectors: {
		"&:hover": {
			color: "#a23030",
			background: "var(--color-surface-subtle)",
		},

		"&:focus-visible": {
			outline: "3px solid var(--color-primary-soft)",
		},
	},
});

export const itemActions = style({
	display: "grid",
	gridTemplateColumns: "repeat(2, 44px)",
	gap: 4,
});

export const editButton = style({
	minWidth: 44,
	minHeight: 44,
	padding: 8,
	color: "var(--color-primary)",
	background: "transparent",
	border: 0,
	borderRadius: 8,
	font: "inherit",
	cursor: "pointer",

	selectors: {
		"&:hover": {
			background: "var(--color-surface-subtle)",
		},

		"&:focus-visible": {
			outline: "3px solid var(--color-primary-soft)",
		},
	},
});

export const moveButton = style({
	width: 44,
	height: 44,
	padding: 0,
	color: "var(--color-text-muted)",
	background: "transparent",
	border: 0,
	borderRadius: 8,
	font: "inherit",
	fontSize: 20,
	cursor: "pointer",

	selectors: {
		"&:hover:not(:disabled)": {
			color: "var(--color-primary)",
			background: "var(--color-surface-subtle)",
		},

		"&:disabled": {
			cursor: "not-allowed",
			opacity: 0.3,
		},

		"&:focus-visible": {
			outline: "3px solid var(--color-primary-soft)",
		},
	},
});

export const editForm = style({
	display: "grid",
	gridColumn: "1 / -1",
	gap: 12,
	width: "100%",
});

export const editActions = style({
	display: "flex",
	justifyContent: "flex-end",
	gap: 8,
});

export const cancelButton = style({
	minHeight: 40,
	paddingInline: 14,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
	cursor: "pointer",
});

export const saveButton = style({
	minHeight: 40,
	paddingInline: 18,
	color: "var(--color-primary-text)",
	background: "var(--color-primary)",
	border: 0,
	borderRadius: 8,
	font: "inherit",
	fontWeight: 700,
	cursor: "pointer",

	selectors: {
		"&:disabled": {
			cursor: "not-allowed",
			opacity: 0.6,
		},
	},
});
