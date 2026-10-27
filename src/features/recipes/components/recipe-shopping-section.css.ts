import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 8,
	width: "min(100% - 32px, 640px)",
	marginInline: "auto",
	marginBottom: 16,
	color: "var(--color-text)",
});

export const checkRow = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
});

export const hint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const sheetBody = style({ display: "grid", gap: 12 });

export const list = style({
	display: "grid",
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const row = style({
	display: "grid",
	gap: 8,
	justifyItems: "start",
	paddingBlock: 12,
	borderTop: "1px solid var(--color-border)",
	selectors: { "&:first-child": { borderTop: 0 } },
});

export const status = style({
	color: "var(--color-text)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const footer = style({ display: "grid", gap: 8 });
