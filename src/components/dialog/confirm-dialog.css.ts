import { style } from "@vanilla-extract/css";

export const root = style({
	position: "fixed",
	inset: 0,
	zIndex: 30,
	display: "grid",
	placeItems: "center",
	padding: 16,
});

export const scrim = style({
	position: "absolute",
	inset: 0,
	background: "var(--color-overlay)",
});

export const dialog = style({
	boxSizing: "border-box",
	position: "relative",
	display: "grid",
	gap: 12,
	width: "min(100%, 360px)",
	padding: 20,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	borderRadius: "var(--radius-dialog)",
	boxShadow: "var(--shadow-md)",
	outline: "none",
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-bold)",
	lineHeight: 1.3,
});

export const message = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: 1.6,
});

export const actions = style({
	display: "grid",
	gridTemplateColumns: "1fr 1fr",
	gap: 12,
	marginTop: 4,
});
