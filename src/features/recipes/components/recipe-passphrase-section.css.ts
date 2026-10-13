import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 8,
	marginBlock: 16,
	padding: 12,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 10,
});

export const title = style({ margin: 0, fontSize: 17 });

export const note = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 13,
	lineHeight: 1.6,
});

export const passphrase = style({
	margin: 0,
	fontSize: 22,
	fontWeight: 700,
	letterSpacing: "0.04em",
	wordBreak: "break-all",
});

export const actions = style({ display: "flex", flexWrap: "wrap", gap: 8 });

export const button = style({
	minHeight: 36,
	paddingInline: 12,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
	cursor: "pointer",

	selectors: {
		"&:disabled": { cursor: "not-allowed", opacity: 0.5 },
	},
});
