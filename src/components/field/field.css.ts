import { style } from "@vanilla-extract/css";

export const field = style({
	display: "flex",
	flexDirection: "column",
	gap: 8,
});

export const label = style({
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
	lineHeight: 1.35,
});

export const optional = style({
	marginLeft: 6,
	color: "var(--color-text-muted)",
	fontWeight: "var(--font-weight-regular)",
});

export const input = style({
	boxSizing: "border-box",
	width: "100%",
	height: 48,
	padding: "0 20px",
	border: "1.5px solid var(--color-control-border)",
	borderRadius: "var(--radius-control)",
	background: "var(--color-surface)",
	color: "var(--color-text)",
	font: "inherit",
	fontSize: 16,
	lineHeight: 1.35,
	transition: `border-color var(--duration-fast) var(--ease-standard)`,

	selectors: {
		"&::placeholder": { color: "var(--color-text-muted)" },
		"&:hover:not(:disabled)": { borderColor: "var(--color-text)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
		'&[aria-invalid="true"]': {
			borderColor: "var(--color-error)",
			boxShadow: "inset 0 0 0 1px var(--color-error)",
		},
		"&:disabled": {
			background: "var(--color-surface-muted)",
			color: "var(--color-text-disabled)",
			borderColor: "var(--color-border)",
			cursor: "not-allowed",
		},
	},
});

export const textarea = style({
	height: "auto",
	minHeight: 96,
	padding: "12px 20px",
	borderRadius: 20,
	resize: "vertical",
});

// 選択（select）：矢印の分、右の余白を広げる。
export const select = style({
	appearance: "none",
	paddingRight: 48,
	backgroundImage:
		"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23292720' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
	backgroundRepeat: "no-repeat",
	backgroundPosition: "right 16px center",
	backgroundSize: 20,
});

export const hint = style({
	margin: 0,
	paddingLeft: 4,
	fontSize: "var(--font-size-sm)",
	color: "var(--color-text-muted)",
	lineHeight: 1.5,
});

export const error = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	margin: 0,
	fontSize: "var(--font-size-sm)",
	color: "var(--color-error)",
	lineHeight: 1.45,
});
