import { style } from "@vanilla-extract/css";

export const nav = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
	width: "min(100% - 32px, 760px)",
	marginInline: "auto",
	paddingBlock: 12,
	borderBottom: "1px solid var(--color-border)",
});

export const link = style({
	minHeight: 44,
	display: "inline-flex",
	alignItems: "center",
	paddingInline: 12,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	textDecoration: "none",
});

export const currentLink = style({
	fontWeight: 700,
	borderColor: "var(--color-primary)",
});
