import { style } from "@vanilla-extract/css";

export const container = style({ display: "grid", gap: 12 });

export const note = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-relaxed)",
});

export const consent = style({
	display: "grid",
	gap: 8,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-relaxed)",
});
