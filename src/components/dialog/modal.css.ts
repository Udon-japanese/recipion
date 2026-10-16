import { style } from "@vanilla-extract/css";

export const root = style({
	position: "fixed",
	inset: 0,
	zIndex: 30,
	display: "grid",
	placeItems: "center",
	padding: 24,
});

export const scrim = style({
	position: "absolute",
	inset: 0,
	background: "var(--color-overlay)",
});

export const modal = style({
	boxSizing: "border-box",
	position: "relative",
	display: "grid",
	gridTemplateRows: "auto minmax(0, 1fr) auto",
	width: "min(100%, 1040px)",
	maxHeight: "calc(100dvh - 48px)",
	color: "var(--color-text)",
	background: "var(--color-surface)",
	borderRadius: "var(--radius-dialog)",
	boxShadow: "var(--shadow-md)",
	outline: "none",
});

export const header = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 12,
	padding: "16px 20px 8px 24px",
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-bold)",
	lineHeight: 1.3,
});

export const body = style({
	minHeight: 0,
	padding: "8px 24px 16px",
	overflowY: "auto",
});

export const footer = style({
	display: "flex",
	justifyContent: "flex-end",
	gap: 12,
	padding: "12px 24px 20px",
	borderTop: "1px solid var(--color-border)",
});
