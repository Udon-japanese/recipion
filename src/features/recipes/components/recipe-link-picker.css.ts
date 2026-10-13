import { style } from "@vanilla-extract/css";

export const picker = style({
	display: "grid",
	gap: 8,
	padding: 10,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
});

export const header = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 8,
});

export const title = style({
	margin: 0,
	fontSize: 14,
	fontWeight: 700,
});

export const search = style({
	minHeight: 40,
	padding: "6px 10px",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
});

export const list = style({
	display: "grid",
	gap: 2,
	maxHeight: 220,
	margin: 0,
	padding: 0,
	overflowY: "auto",
	listStyle: "none",
});

export const item = style({
	width: "100%",
	padding: "8px 10px",
	textAlign: "left",
	background: "transparent",
	border: "none",
	borderRadius: 6,
	cursor: "pointer",
	selectors: {
		"&:hover": { background: "var(--color-surface-muted)" },
	},
});

export const message = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 13,
});

export const hint = style({
	color: "var(--color-text-muted)",
	fontSize: 13,
});

export const modes = style({
	display: "flex",
	gap: 8,
	margin: 0,
	padding: 0,
	border: "none",
});
