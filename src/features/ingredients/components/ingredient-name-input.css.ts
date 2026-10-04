import { style } from "@vanilla-extract/css";

export const container = style({
	position: "relative",
	display: "grid",
});

export const list = style({
	position: "absolute",
	zIndex: 10,
	top: "100%",
	left: 0,
	right: 0,
	display: "grid",
	maxHeight: 280,
	marginTop: 4,
	overflowY: "auto",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	boxShadow: "0 6px 16px rgba(0, 0, 0, 0.12)",
});

export const option = style({
	minHeight: 44,
	paddingInline: 12,
	color: "var(--color-text)",
	background: "transparent",
	border: 0,
	font: "inherit",
	textAlign: "left",
	cursor: "pointer",

	selectors: {
		'&[aria-selected="true"]': {
			background: "var(--color-primary-soft)",
		},
	},
});
