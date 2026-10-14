import { style } from "@vanilla-extract/css";

export const container = style({
	width: "min(100% - 32px, 760px)",
	marginInline: "auto",
	paddingBlock: 24,
	color: "var(--color-text)",
});

export const title = style({
	margin: "0 0 16px",
	fontSize: 22,
});

export const list = style({
	display: "grid",
	gap: 16,
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const item = style({
	display: "grid",
	gap: 8,
	padding: 12,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 10,
});

export const recipeName = style({
	margin: 0,
	fontSize: 17,
	fontWeight: 700,
});

export const meta = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 13,
});

export const detail = style({
	margin: 0,
	whiteSpace: "pre-wrap",
});

export const actions = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
});

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

export const dangerButton = style({
	color: "var(--color-error)",
});

export const error = style({
	margin: 0,
	color: "var(--color-error)",
});

export const preview = style({
	paddingTop: 8,
	borderTop: "1px solid var(--color-border)",
});
