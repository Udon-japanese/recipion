import { style } from "@vanilla-extract/css";

export const body = style({
	display: "grid",
	gap: 28,
});

export const section = style({ display: "grid", gap: 12 });

export const sectionHeader = style({
	display: "flex",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: 12,
});

export const sectionTitle = style({
	margin: 0,
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-bold)",
});

export const count = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-regular)",
});

export const hint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const addRow = style({
	display: "flex",
	alignItems: "flex-start",
	gap: 8,
});

export const addInput = style({ flex: 1, minWidth: 0 });
