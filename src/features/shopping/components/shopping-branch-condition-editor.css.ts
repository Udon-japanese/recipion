import { style } from "@vanilla-extract/css";

// いま設定した結果を、文章で見せる（直すと、すぐに変わる）。
export const preview = style({
	display: "grid",
	gap: 2,
	margin: "4px 0 16px",
	padding: "12px 14px",
	borderRadius: 16,
	background: "var(--color-primary-soft)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const previewTitle = style({
	margin: 0,
	color: "var(--color-accent-text)",
	fontSize: "var(--font-size-xs)",
	fontWeight: "var(--font-weight-bold)",
	letterSpacing: "0.04em",
});

export const previewCondition = style({ margin: 0 });

export const previewSide = style({
	display: "flex",
	alignItems: "center",
	gap: 6,
	margin: 0,
});

export const group = style({
	display: "grid",
	gap: 8,
	margin: "0 0 16px",
	padding: 0,
	border: 0,
});

export const groupLabel = style({
	padding: 0,
	marginBottom: 8,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
	fontWeight: "var(--font-weight-bold)",
	letterSpacing: "0.04em",
});

export const sentence = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 6,
});

export const joshi = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const token = style({
	boxSizing: "border-box",
	display: "inline-flex",
	alignItems: "center",
	gap: 6,
	minHeight: 40,
	padding: "0 12px",
	border: "1.5px solid var(--color-control-border)",
	borderRadius: 12,
	background: "var(--color-surface)",
	color: "var(--color-text)",
	font: "inherit",
	fontWeight: "var(--font-weight-bold)",
	cursor: "pointer",

	selectors: {
		'&[aria-pressed="true"]': {
			borderColor: "var(--color-text)",
			background: "var(--color-primary-soft)",
		},
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const tokenSub = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
	fontWeight: "var(--font-weight-regular)",
});

export const tokenEmpty = style({
	color: "var(--color-text-disabled)",
	fontWeight: "var(--font-weight-regular)",
});

// 押した部品の入力（その部分だけ）。
export const editor = style({
	display: "grid",
	gap: 12,
	padding: 12,
	borderRadius: 16,
	background: "var(--color-surface-muted)",
});

export const pair = style({
	display: "grid",
	gridTemplateColumns: "1fr 1fr",
	gap: 12,
});

export const presets = style({
	display: "grid",
	gap: 8,
	margin: 0,
	padding: 0,
	border: 0,
});

export const chips = style({ display: "flex", flexWrap: "wrap", gap: 8 });

export const advanced = style({
	marginBottom: 8,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const advancedSummary = style({ cursor: "pointer", padding: "6px 0" });

export const advancedBody = style({ paddingTop: 8 });
