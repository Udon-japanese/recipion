import { style } from "@vanilla-extract/css";

export const byline = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 6,
	minWidth: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const name = style({
	color: "var(--color-text)",
	fontWeight: "var(--font-weight-semibold)",
});

export const visuallyHidden = style({
	position: "absolute",
	width: 1,
	height: 1,
	overflow: "hidden",
	clip: "rect(0 0 0 0)",
	whiteSpace: "nowrap",
});
