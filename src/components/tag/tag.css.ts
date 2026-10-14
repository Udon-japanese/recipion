import { style } from "@vanilla-extract/css";

// 枠なし＝押せない（見るだけ）。
export const tag = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 4,
	height: 28,
	padding: "0 10px",
	borderRadius: 9999,
	background: "var(--color-surface-muted)",
	color: "var(--color-text)",
	fontSize: 14,
	fontWeight: 500,
	lineHeight: 1,
	whiteSpace: "nowrap",

	selectors: {
		'&[data-tone="warn"]': { background: "var(--color-warning-soft)" },
		'&[data-tone="error"]': {
			background: "var(--color-error-soft)",
			fontWeight: 600,
		},
		'&[data-tone="soft"]': { background: "var(--color-primary-soft)" },
		'&[data-tone="success"]': {
			background: "var(--color-success-soft)",
			fontWeight: 700,
		},
		// 「約」（だいたい）の印：破線の輪郭。
		"&[data-approximate]": {
			outline: "1.5px dashed var(--color-text-muted)",
			outlineOffset: -1.5,
		},
	},
});

export const icon = style({
	selectors: {
		'[data-tone="warn"] > &': { color: "var(--color-warning)" },
		'[data-tone="error"] > &': { color: "var(--color-error)" },
		'[data-tone="success"] > &': { color: "var(--color-success)" },
	},
});
