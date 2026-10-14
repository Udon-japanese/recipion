import { style } from "@vanilla-extract/css";

export const container = style({
	width: "min(100% - 32px, 760px)",
	marginInline: "auto",
	marginTop: 24,
	color: "var(--color-text)",
});

export const summary = style({
	cursor: "pointer",
	fontWeight: 700,
});

export const list = style({
	display: "grid",
	gap: 8,
	margin: "12px 0 0",
	padding: 0,
	listStyle: "none",
});

export const item = style({
	display: "grid",
	gap: 4,
	padding: 12,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 16,
});

export const title = style({
	margin: 0,
	fontWeight: 700,
});

export const meta = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 13,
});

export const detail = style({
	margin: 0,
	overflowWrap: "anywhere",
	whiteSpace: "pre-wrap",
});
