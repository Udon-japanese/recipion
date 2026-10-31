import { style } from "@vanilla-extract/css";

export const footer = style({
	display: "flex",
	justifyContent: "flex-end",
	width: "100%",
});

export const message = style({
	margin: 0,
	paddingBlock: 8,
	color: "var(--color-text-muted)",
});
