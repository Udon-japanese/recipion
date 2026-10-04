import { style } from "@vanilla-extract/css";

// fieldset の既定の枠・余白を消す（意味づけのためだけに使う）。
export const fieldset = style({
	margin: 0,
	padding: 0,
	border: 0,
	minInlineSize: 0,
});

export const group = style({
	display: "grid",
	gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
	gap: 8,
	maxWidth: 360,
});

export const box = style({
	minWidth: 0,
	minHeight: 56,
	padding: 0,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
	fontSize: 24,
	fontWeight: 700,
	textAlign: "center",
	caretColor: "var(--color-primary)",
	selectors: {
		"&:focus": {
			outline: "3px solid var(--color-primary-soft)",
			borderColor: "var(--color-primary)",
		},
		"&:disabled": { opacity: 0.6 },
	},
});

export const boxInvalid = style({
	borderColor: "#a23030",
});
