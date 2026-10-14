import { keyframes, style } from "@vanilla-extract/css";

const spin = keyframes({ to: { transform: "rotate(360deg)" } });

export const note = style({
	display: "flex",
	alignItems: "center",
	gap: 12,
	minHeight: 52,
	padding: "8px 8px 8px 16px",
	borderRadius: 16,
	background: "var(--color-surface-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: 1.45,

	selectors: {
		'&[data-tone="info"]': { background: "var(--color-primary-soft)" },
		'&[data-tone="warn"]': { background: "var(--color-warning-soft)" },
		'&[data-tone="success"]': { background: "var(--color-success-soft)" },
		'&[data-tone="error"]': { background: "var(--color-error-soft)" },
	},
});

export const icon = style({
	flex: "none",
	display: "inline-flex",

	selectors: {
		'[data-tone="warn"] &': { color: "var(--color-warning)" },
		'[data-tone="success"] &': { color: "var(--color-success)" },
		'[data-tone="error"] &': { color: "var(--color-error)" },
		'&[data-spinning="true"]': { animation: `${spin} 1s linear infinite` },
	},

	"@media": {
		"(prefers-reduced-motion: reduce)": {
			selectors: { '&[data-spinning="true"]': { animation: "none" } },
		},
	},
});

export const text = style({ flex: 1, minWidth: 0 });
