import { style } from "@vanilla-extract/css";

export const line = style({
	display: "flex",
	alignItems: "center",
	flexWrap: "wrap",
	gap: 8,
});

export const word = style({
	flex: "none",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
});

export const labelInput = style({
	flex: "0 1 96px",
	minWidth: 72,
});

export const numberInput = style({
	flex: "1 1 96px",
	minWidth: 80,
});

export const unitSelect = style({
	flex: "none",
	minWidth: 72,
});

export const hint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});
