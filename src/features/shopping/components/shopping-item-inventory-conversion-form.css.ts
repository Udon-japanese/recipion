import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 16,
	marginBottom: 24,
	padding: 16,
	background: "var(--color-surface-subtle)",
	border: "1px solid var(--color-border)",
	borderRadius: 10,
});

export const title = style({
	margin: 0,
	color: "var(--color-text)",
	fontSize: 18,
});

export const description = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 14,
});

export const presets = style({
	display: "grid",
	gap: 8,
	margin: 0,
	padding: 0,
	border: 0,
});

export const legend = style({
	marginBottom: 8,
	padding: 0,
	color: "var(--color-text)",
	fontWeight: 600,
});

export const presetList = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
});

export const presetButton = style({
	minHeight: 40,
	paddingInline: 14,
	color: "var(--color-primary)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 999,
	font: "inherit",
	cursor: "pointer",
});

export const form = style({
	display: "grid",
	gap: 12,
});

export const formula = style({
	margin: 0,
	color: "var(--color-text)",
	fontWeight: 600,
});

export const field = style({
	display: "grid",
	gap: 6,
});

export const label = style({
	color: "var(--color-text-muted)",
	fontSize: 14,
	fontWeight: 600,
});

export const input = style({
	minWidth: 0,
	minHeight: 44,
	paddingInline: 12,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
});

export const actions = style({
	display: "flex",
	justifyContent: "flex-end",
	gap: 8,
});

export const cancelButton = style({
	minHeight: 40,
	paddingInline: 14,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
	cursor: "pointer",
});

export const saveButton = style({
	minHeight: 40,
	paddingInline: 14,
	color: "var(--color-primary-text)",
	background: "var(--color-primary)",
	border: 0,
	borderRadius: 8,
	font: "inherit",
	fontWeight: 700,
	cursor: "pointer",
});

export const error = style({
	margin: 0,
	color: "#a23030",
	fontSize: 14,
});
