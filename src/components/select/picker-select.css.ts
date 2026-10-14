import { style } from "@vanilla-extract/css";

// PC の選択肢の一覧（ブラウザ標準の見た目ではなく、アプリの部品に合わせる）。
export const popover = style({
	position: "fixed",
	zIndex: 30,
	display: "flex",
	flexDirection: "column",
	gap: 2,
	padding: 6,
	overflowY: "auto",
	overscrollBehavior: "contain",
	border: "1.5px solid var(--color-border-strong)",
	borderRadius: 20,
	background: "var(--color-surface)",
	boxShadow: "var(--shadow-md)",
});

export const list = style({
	display: "flex",
	flexDirection: "column",
	gap: 2,
});

export const option = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 12,
	width: "100%",
	minHeight: 44,
	padding: "0 16px",
	border: 0,
	borderRadius: 14,
	background: "transparent",
	color: "var(--color-text)",
	font: "inherit",
	fontSize: 16,
	textAlign: "left",
	cursor: "pointer",

	selectors: {
		"&:hover:not(:disabled)": { background: "var(--color-surface-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
		},
		'&[aria-current="true"]': {
			background: "var(--color-primary-soft)",
			fontWeight: "var(--font-weight-semibold)",
		},
		"&:disabled": {
			color: "var(--color-text-disabled)",
			cursor: "not-allowed",
		},
	},
});

export const check = style({
	display: "grid",
	flex: "none",
	placeItems: "center",
});
