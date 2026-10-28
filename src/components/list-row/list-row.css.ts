import { style } from "@vanilla-extract/css";

export const row = style({
	position: "relative",
	display: "flex",
	alignItems: "center",
	minHeight: 64,
	padding: "12px 4px",
	borderTop: "1px solid var(--color-border)",
	listStyle: "none",

	selectors: {
		"&:first-child": { borderTop: 0 },
		// チェックを入れた（買った）行は、薄い緑（色で、済んだことが分かる）。
		"&[data-checked]": {
			background: "var(--color-success-soft)",
			borderRadius: 12,
			borderTopColor: "transparent",
		},
		// 持ち上げて動かしているとき。
		"&[data-dragging]": {
			background: "var(--color-surface)",
			border: "2px solid var(--color-text)",
			borderRadius: 16,
			boxShadow: "var(--shadow-md)",
		},
	},
});

export const main = style({
	display: "flex",
	flexDirection: "column",
	flex: 1,
	minWidth: 0,
	gap: 4,
	padding: "0 8px",
});

export const actions = style({
	display: "flex",
	flex: "none",
	alignItems: "center",
	gap: 0,
});

export const name = style({
	fontSize: 16,
	fontWeight: "var(--font-weight-semibold)",
	lineHeight: 1.35,
	overflowWrap: "anywhere",
});

export const nameDone = style([
	name,
	{
		fontWeight: "var(--font-weight-medium)",
		color: "var(--color-text-muted)",
		textDecoration: "line-through",
		textDecorationThickness: "1.5px",
	},
]);

export const meta = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 6,
	fontSize: 14,
	color: "var(--color-text-muted)",
});
