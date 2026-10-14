import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 8,
});

export const hint = style({
	paddingLeft: 4,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const fractionButtons = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
});
