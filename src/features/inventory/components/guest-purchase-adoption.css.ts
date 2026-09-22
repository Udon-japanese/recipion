import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 12,
	width: "min(100% - 32px, 640px)",
	margin: "16px auto 0",
	padding: 16,
	color: "var(--color-text)",
	background: "var(--color-surface-subtle)",
	border: "1px solid var(--color-border)",
	borderRadius: 10,
});

export const title = style({
	margin: 0,
	fontWeight: 700,
});

export const message = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 14,
});

export const actions = style({
	display: "flex",
	flexWrap: "wrap",
	justifyContent: "flex-end",
	gap: 8,
});

export const primaryButton = style({
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

export const secondaryButton = style({
	minHeight: 40,
	paddingInline: 14,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
	cursor: "pointer",
});

export const error = style({
	margin: 0,
	color: "#a23030",
	fontSize: 14,
});
