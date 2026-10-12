import { style } from "@vanilla-extract/css";

export const container = style({
	width: "min(100% - 32px, 520px)",
	marginInline: "auto",
	paddingBlock: 24,
	display: "grid",
	gap: 12,
	color: "var(--color-text)",
});

export const title = style({ margin: 0, fontSize: 22 });

export const note = style({
	margin: 0,
	color: "var(--color-text-muted)",
	lineHeight: 1.7,
});

export const form = style({ display: "grid", gap: 8 });

export const input = style({
	minHeight: 40,
	paddingInline: 8,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
});

export const message = style({ margin: 0, color: "#a23030" });

export const button = style({
	minHeight: 40,
	paddingInline: 16,
	justifySelf: "start",
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
