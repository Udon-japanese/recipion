import { style } from "@vanilla-extract/css";

const PC = "(min-width: 768px)";

export const page = style({
	display: "flex",
	flexDirection: "column",
	gap: 12,

	"@media": {
		[PC]: { gap: 20, maxWidth: 720, marginInline: "auto" },
	},
});

export const hero = style({
	display: "flex",
	justifyContent: "center",
	padding: "16px 0 12px",

	"@media": {
		[PC]: { paddingTop: 32, paddingBottom: 16 },
	},
});

export const greeting = style({
	display: "flex",
	alignItems: "center",
	gap: 12,
	padding: 4,

	"@media": {
		[PC]: { gap: 16 },
	},
});

export const greetingTitle = style({
	margin: 0,
	fontSize: 22,
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: 1.35,

	"@media": {
		[PC]: { fontSize: 28 },
	},
});

export const greetingName = style({
	margin: 0,
	fontSize: 14,
	color: "var(--color-text-muted)",
	lineHeight: 1.55,
});

export const cards = style({
	display: "grid",
	gridTemplateColumns: "minmax(0, 1fr)",
	gap: 12,

	"@media": {
		[PC]: { gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 },
	},
});

export const card = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 16,
	minHeight: 96,
	padding: 16,
	borderRadius: "var(--radius-card)",
	background: "var(--color-surface)",
	boxShadow: "var(--shadow-sm)",
	color: "var(--color-text)",
	textDecoration: "none",

	selectors: {
		"&:hover": { boxShadow: "var(--shadow-md)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
		'&[data-locked="true"]': {
			background: "var(--color-surface-muted)",
			boxShadow: "none",
		},
	},

	"@media": {
		[PC]: {
			flexDirection: "column",
			alignItems: "flex-start",
			minHeight: 168,
			padding: 20,
			position: "relative",
		},
	},
});

export const iconTile = style({
	display: "grid",
	placeItems: "center",
	flex: "none",
	width: 56,
	height: 56,
	borderRadius: "50%",
	background: "var(--color-primary-soft)",
});

export const text = style({
	flex: 1,
	minWidth: 0,
	display: "flex",
	flexDirection: "column",
	gap: 6,
	alignItems: "flex-start",
});

export const cardTitle = style({
	margin: 0,
	fontSize: 18,
	fontWeight: "var(--font-weight-bold)",
	lineHeight: 1.35,
});

export const caption = style({
	fontSize: 14,
	fontWeight: "var(--font-weight-semibold)",
	color: "var(--color-text-muted)",
});

export const countRow = style({
	display: "flex",
	alignItems: "baseline",
	gap: 6,
});

export const count = style({
	fontSize: 28,
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: 1,
	fontVariantNumeric: "tabular-nums",
});

export const unit = style({
	fontSize: 14,
	color: "var(--color-text-muted)",
	lineHeight: 1.55,
});

export const chevron = style({
	flex: "none",
	color: "var(--color-text-muted)",

	"@media": {
		[PC]: { position: "absolute", right: 20, bottom: 20 },
	},
});

export const loginRow = style({
	paddingTop: 12,

	// PC は、左のナビにログインがある。
	"@media": {
		[PC]: { display: "none" },
	},
});

export const visuallyHidden = style({
	position: "absolute",
	width: 1,
	height: 1,
	margin: -1,
	padding: 0,
	overflow: "hidden",
	clip: "rect(0 0 0 0)",
	whiteSpace: "nowrap",
	border: 0,
});
