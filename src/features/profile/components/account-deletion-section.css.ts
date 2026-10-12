import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 8,
	marginTop: 32,
	paddingTop: 16,
	borderTop: "1px solid var(--color-border)",
});

export const title = style({ margin: 0, fontSize: 17 });

export const note = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 13,
	lineHeight: 1.7,
});

export const list = style({
	margin: 0,
	paddingLeft: 20,
	color: "var(--color-text-muted)",
	fontSize: 13,
	lineHeight: 1.7,
});

export const input = style({
	minHeight: 40,
	paddingInline: 8,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
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

export const dangerButton = style({ color: "#a23030" });

export const error = style({ margin: 0, color: "#a23030" });
