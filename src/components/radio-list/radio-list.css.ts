import { style } from "@vanilla-extract/css";

export const root = style({
	boxSizing: "border-box",
	display: "grid",
	gap: 8,
	minWidth: 0,
	margin: 0,
	padding: 0,
	border: 0,
});

export const legend = style({
	padding: 0,
	marginBottom: 8,
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
	lineHeight: "var(--line-height-tight)",
});

export const hiddenLegend = style({
	position: "absolute",
	width: 1,
	height: 1,
	overflow: "hidden",
	clip: "rect(0 0 0 0)",
});

export const options = style({
	boxSizing: "border-box",
	border: "1px solid var(--color-border)",
	borderRadius: "var(--radius-card)",
	background: "var(--color-surface)",
});

export const option = style({
	position: "relative",
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 12,
	minHeight: 56,
	padding: "8px 16px",
	cursor: "pointer",
	selectors: {
		"& + &": { borderTop: "1px solid var(--color-border)" },
		// 枠の角に合わせる（枠は、フォーカスの線を切らないよう、はみ出しを隠さない）。
		"&:first-child": {
			borderTopLeftRadius: "calc(var(--radius-card) - 1px)",
			borderTopRightRadius: "calc(var(--radius-card) - 1px)",
		},
		"&:last-child": {
			borderBottomLeftRadius: "calc(var(--radius-card) - 1px)",
			borderBottomRightRadius: "calc(var(--radius-card) - 1px)",
		},
		"&:has(input:disabled)": {
			color: "var(--color-text-disabled)",
			cursor: "not-allowed",
		},
		"&:has(input:checked)": { background: "var(--color-primary-soft)" },
		"&:has(input:focus-visible)": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
		},
	},
});

export const radio = style({
	position: "absolute",
	opacity: 0,
	pointerEvents: "none",
});

export const mark = style({
	boxSizing: "border-box",
	display: "grid",
	placeItems: "center",
	flex: "none",
	width: 24,
	height: 24,
	border: "2px solid var(--color-control-border)",
	borderRadius: "50%",
	selectors: {
		[`${option}:has(input:checked) &`]: {
			borderColor: "var(--color-text)",
			background:
				"radial-gradient(circle, var(--color-text) 0 6px, transparent 6.5px)",
		},
	},
});

export const optionText = style({
	display: "grid",
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-medium)",
	lineHeight: "var(--line-height-tight)",
});

export const detail = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-regular)",
});
