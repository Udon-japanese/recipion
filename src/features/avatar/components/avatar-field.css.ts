import { style } from "@vanilla-extract/css";

// プロフィールの、アバターの入り口（丸い絵。右下に鉛筆）。
export const entry = style({
	position: "relative",
	justifySelf: "start",
	display: "grid",
	padding: 0,
	border: "none",
	borderRadius: "50%",
	background: "none",
	cursor: "pointer",
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 3,
		},
	},
});

export const entryBadge = style({
	position: "absolute",
	right: -4,
	bottom: -4,
	display: "grid",
	placeItems: "center",
	width: 32,
	height: 32,
	borderRadius: "50%",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	boxShadow: "var(--shadow-md)",
	color: "var(--color-text)",
});

export const error = style({
	margin: 0,
	display: "flex",
	alignItems: "center",
	gap: 8,
	color: "var(--color-error)",
	fontSize: "var(--font-size-sm)",
});
