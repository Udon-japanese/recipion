import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 8,
	marginBlock: 16,
});

export const fieldset = style({
	display: "grid",
	gap: 6,
	margin: 0,
	padding: 12,
	border: "1px solid var(--color-border)",
	borderRadius: 10,
});

export const option = style({ display: "flex", alignItems: "center", gap: 8 });

export const textarea = style({
	minHeight: 90,
	padding: 8,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
});

export const actions = style({ display: "flex", gap: 8 });

export const note = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 13,
});

export const button = style({
	minHeight: 36,
	paddingInline: 12,
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
