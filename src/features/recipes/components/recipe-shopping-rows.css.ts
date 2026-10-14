import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 16,
});

export const hint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const card = style({
	margin: 0,
	padding: "4px 0",
	listStyle: "none",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: "var(--radius-card)",
});

export const sectionHeading = style({
	padding: "10px 16px 6px",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
	borderTop: "1px solid var(--color-border)",
	selectors: {
		"&:first-child": { borderTop: 0 },
	},
});

export const row = style({
	display: "flex",
	alignItems: "flex-start",
	gap: 8,
	padding: "10px 16px 10px 4px",
	borderTop: "1px solid var(--color-border)",
	selectors: {
		"&:first-child": { borderTop: 0 },
	},
});

export const rowBody = style({
	display: "grid",
	gap: 4,
	flex: 1,
	minWidth: 0,
	paddingTop: 10,
});

export const rowTop = style({
	display: "flex",
	justifyContent: "space-between",
	gap: 8,
});

export const rowName = style({
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-semibold)",
	lineHeight: "var(--line-height-tight)",
});

export const amountText = style({
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-semibold)",
	whiteSpace: "nowrap",
});

export const status = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const shortStatus = style({
	color: "var(--color-accent-text)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
	lineHeight: "var(--line-height-normal)",
});

export const existing = style({
	display: "flex",
	alignItems: "flex-start",
	gap: 6,
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const rowAction = style({
	marginTop: 6,
});
