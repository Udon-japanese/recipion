import { style } from "@vanilla-extract/css";

const PC = "(min-width: 768px)";

export const root = style({
	display: "flex",
	flexDirection: "column",
	minHeight: "100dvh",

	"@media": {
		[PC]: { flexDirection: "row" },
	},
});

// スマホの上のヘッダー。
export const header = style({
	position: "sticky",
	top: 0,
	zIndex: 10,
	display: "flex",
	alignItems: "center",
	gap: 4,
	height: 56,
	flex: "none",
	padding: "0 6px 0 16px",
	background: "var(--color-background)",
	borderBottom: "1px solid var(--color-border)",

	"@media": {
		[PC]: { display: "none" },
	},
});

export const logo = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	flex: 1,
	minWidth: 0,
	minHeight: 44,
	fontSize: 18,
	fontWeight: "var(--font-weight-extrabold)",
	color: "var(--color-text)",
	textDecoration: "none",
});

export const accountSlot = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "flex-end",
	minWidth: 44,
	minHeight: 44,
	paddingRight: 10,
});

// アバターを押せる範囲（44px）に広げる。
export const avatarLink = style({
	display: "grid",
	placeItems: "center",
	width: 44,
	height: 44,
	borderRadius: "50%",
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -2,
		},
	},
});

// ヘッダーの右の、アイコンだけのリンク（設定）。押せる範囲は 44px。
export const headerIconLink = style({
	display: "grid",
	placeItems: "center",
	width: 44,
	height: 44,
	color: "var(--color-text-muted)",
	borderRadius: "50%",
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -2,
		},
	},
});

export const main = style({
	flex: 1,
	minWidth: 0,
	padding: 16,

	"@media": {
		[PC]: { padding: 32 },
	},
});

export const content = style({
	maxWidth: 960,
	marginInline: "auto",
});

// スマホの下のナビ。
export const bottomNav = style({
	position: "sticky",
	bottom: 0,
	zIndex: 10,
	display: "grid",
	gridTemplateColumns: "repeat(3, 1fr)",
	flex: "none",
	minHeight: 64,
	paddingBottom: "env(safe-area-inset-bottom)",
	background: "var(--color-surface)",
	borderTop: "1px solid var(--color-border)",

	"@media": {
		[PC]: { display: "none" },
	},
});

export const bottomItem = style({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	gap: 2,
	minHeight: 64,
	fontSize: 12,
	fontWeight: "var(--font-weight-medium)",
	color: "var(--color-text-muted)",
	textDecoration: "none",

	selectors: {
		'&[aria-current="page"]': {
			color: "var(--color-text)",
			fontWeight: "var(--font-weight-semibold)",
		},
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
		},
	},
});

export const pill = style({
	display: "grid",
	placeItems: "center",
	width: 56,
	height: 32,
	borderRadius: 9999,

	selectors: {
		[`${bottomItem}[aria-current="page"] &`]: {
			background: "var(--color-primary)",
			color: "var(--color-on-primary)",
		},
	},
});

// PC の左のナビ。
export const side = style({
	display: "none",

	"@media": {
		[PC]: {
			boxSizing: "border-box",
			position: "sticky",
			top: 0,
			display: "flex",
			flexDirection: "column",
			gap: 4,
			width: 232,
			height: "100dvh",
			flex: "none",
			padding: 16,
			borderRight: "1px solid var(--color-border)",
		},
	},
});

export const brand = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	minHeight: 56,
	padding: "0 8px",
	fontSize: 18,
	fontWeight: "var(--font-weight-extrabold)",
	color: "var(--color-text)",
	textDecoration: "none",
});

export const sideNav = style({
	display: "flex",
	flexDirection: "column",
	gap: 4,
});

export const sideItem = style({
	position: "relative",
	display: "flex",
	alignItems: "center",
	gap: 12,
	minHeight: 48,
	padding: "0 16px",
	borderRadius: 9999,
	fontSize: 16,
	color: "var(--color-text-muted)",
	textDecoration: "none",

	selectors: {
		"&:hover": { background: "var(--color-surface-muted)" },
		'&[aria-current="page"]': {
			background: "var(--color-primary-soft)",
			color: "var(--color-text)",
			fontWeight: "var(--font-weight-semibold)",
		},
		'&[aria-current="page"]::before': {
			content: '""',
			position: "absolute",
			left: 0,
			top: 12,
			width: 4,
			height: 24,
			borderRadius: "0 4px 4px 0",
			background: "var(--color-text)",
		},
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
		},
	},
});

// 設定は、機能の並びから離して、下のアカウントの上に置く。
export const sideSettings = style({
	marginTop: "auto",
});

export const me = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 12,
	minHeight: 52,
	padding: 8,
	borderRadius: 16,
	fontSize: 14,
	color: "var(--color-text)",
	textDecoration: "none",
	minWidth: 0,

	selectors: {
		"&:hover": { background: "var(--color-surface-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
		},
	},
});

export const meName = style({
	minWidth: 0,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
});

export const guestSlot = style({
	padding: 8,
});
