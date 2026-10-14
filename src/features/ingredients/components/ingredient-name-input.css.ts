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
	marginTop: 6,
	padding: 4,
	overflowY: "auto",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 16,
	boxShadow: "var(--shadow-md)",
});

export const option = style({
	position: "relative",
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 12,
	height: 48,
	paddingInline: 16,
	color: "var(--color-text)",
	background: "transparent",
	border: 0,
	borderRadius: 12,
	font: "inherit",
	fontSize: 16,
	textAlign: "left",
	cursor: "pointer",

	selectors: {
		'&[aria-selected="true"]': {
			background: "var(--color-primary-soft)",
		},
		// 選ばれている印（色だけに頼らない）。
		'&[aria-selected="true"]::before': {
			content: '""',
			position: "absolute",
			left: 0,
			top: 12,
			width: 4,
			height: 24,
			borderRadius: "0 4px 4px 0",
			background: "var(--color-text)",
		},
	},
});

export const label = style({
	flex: 1,
	minWidth: 0,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
});

export const sub = style({
	flex: "none",
	maxWidth: "55%",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	marginLeft: "auto",
	color: "var(--color-text-muted)",
	fontSize: 14,
});
