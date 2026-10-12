import { style } from "@vanilla-extract/css";

export const fieldset = style({
	display: "grid",
	gap: 8,
	margin: 0,
	padding: 12,
	border: "1px solid var(--color-border)",
	borderRadius: 10,
});

export const legend = style({ paddingInline: 4, fontSize: 14 });

export const option = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
});

export const note = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 13,
});

export const consent = style({
	display: "grid",
	gap: 6,
	color: "var(--color-text-muted)",
	fontSize: 13,
	lineHeight: 1.6,
});
