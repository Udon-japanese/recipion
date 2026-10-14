import { globalStyle, keyframes, style } from "@vanilla-extract/css";

const spin = keyframes({ to: { transform: "rotate(360deg)" } });

export const form = style({
	display: "flex",
	flexDirection: "column",
	gap: 16,
});

export const lead = style({
	margin: 0,
	fontSize: 16,
	lineHeight: 1.7,
});

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

export const consent = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 12,
	lineHeight: 1.7,
});

globalStyle(`${consent} a`, {
	color: "var(--color-accent-text)",
	textDecoration: "underline",
	textUnderlineOffset: 3,
});

export const botCheck = style({
	display: "flex",
	flexDirection: "column",
	gap: 8,
});

const row = style({
	display: "flex",
	alignItems: "center",
	gap: 12,
	minHeight: 64,
	padding: "0 16px",
	border: "1.5px solid var(--color-border-strong)",
	borderRadius: 16,
	background: "var(--color-surface)",
	fontSize: 14,
});

export const botCheckPending = style([row]);

export const botCheckDone = style([
	row,
	{
		background: "var(--color-success-soft)",
		borderColor: "var(--color-success)",
	},
]);

export const spin_ = style({
	display: "inline-flex",
	animation: `${spin} 1s linear infinite`,

	"@media": {
		"(prefers-reduced-motion: reduce)": { animation: "none" },
	},
});
