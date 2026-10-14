import { style } from "@vanilla-extract/css";

export const picker = style({
	display: "grid",
	gap: 8,
	padding: 12,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border-strong)",
	borderRadius: "var(--radius-card)",
	boxShadow: "var(--shadow-sm)",
});

export const header = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 8,
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
});

export const search = style({
	minHeight: 44,
	padding: "0 16px",
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1.5px solid var(--color-control-border)",
	borderRadius: "var(--radius-control)",
	font: "inherit",
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
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
	color: "var(--color-text)",
	font: "inherit",
	borderRadius: 12,
	cursor: "pointer",
	selectors: {
		"&:hover": { background: "var(--color-primary-soft)" },
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
