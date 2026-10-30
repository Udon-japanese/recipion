import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 16,
});

export const estimateNote = style({
	display: "flex",
	alignItems: "flex-start",
	gap: 8,
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const group = style({
	display: "grid",
	gap: 8,
});

export const groupLabel = style({
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
	lineHeight: "var(--line-height-tight)",
});

export const detailsToggle = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 8,
	width: "100%",
	minHeight: 44,
	padding: 0,
	color: "var(--color-text)",
	textAlign: "left",
	cursor: "pointer",
});

export const detailsTitle = style({
	flex: "none",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
});

export const detailsSummary = style({
	flex: 1,
	minWidth: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
});

export const chevron = style({
	flex: "none",
	display: "grid",
	placeItems: "center",
	transition: "transform 0.15s ease",
	selectors: {
		"&[data-open='true']": {
			transform: "rotate(180deg)",
		},
	},
});

export const details = style({
	display: "grid",
	gap: 16,
});
