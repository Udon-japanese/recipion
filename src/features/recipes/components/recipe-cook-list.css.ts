import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 16,
});

export const day = style({
	display: "grid",
	gap: 8,
});

export const dayTitle = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
});

export const list = style({
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const empty = style({
	display: "grid",
	justifyItems: "center",
	gap: 12,
	padding: "32px 16px",
	color: "var(--color-text-muted)",
	textAlign: "center",
});

export const emptyText = style({ margin: 0 });

export const error = style({
	margin: 0,
	color: "var(--color-error)",
});
