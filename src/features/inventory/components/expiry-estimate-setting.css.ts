import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 16,
});

export const options = style({
	boxSizing: "border-box",
	margin: 0,
	padding: 0,
	border: "1px solid var(--color-border)",
	borderRadius: "var(--radius-card)",
	background: "var(--color-surface)",
	overflow: "hidden",
});

export const legend = style({
	position: "absolute",
	width: 1,
	height: 1,
	overflow: "hidden",
	clip: "rect(0 0 0 0)",
});

export const option = style({
	position: "relative",
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 12,
	minHeight: 64,
	padding: "8px 16px",
	cursor: "pointer",
	selectors: {
		"& + &": { borderTop: "1px solid var(--color-border)" },
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
});

export const detail = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-regular)",
});

export const note = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const row = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 12,
	width: "100%",
	minHeight: 48,
	padding: "0 16px",
	border: "1.5px solid var(--color-control-border)",
	borderRadius: "var(--radius-control)",
	background: "var(--color-surface)",
	color: "var(--color-text)",
	font: "inherit",
	cursor: "pointer",
	textAlign: "left",
	selectors: {
		"&:hover": { borderColor: "var(--color-text)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const rowLabel = style({
	flex: 1,
	fontWeight: "var(--font-weight-medium)",
});

export const rowValue = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});
