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

// スマホの下のナビ。選んでいる所は、塗りのアイコンと太字で示す（背景の飾りは付けない）。
export const bottomNav = style({
	position: "sticky",
	bottom: 0,
	zIndex: 10,
	display: "grid",
	gridTemplateColumns: "repeat(3, 1fr)",
	flex: "none",
	paddingBottom: "env(safe-area-inset-bottom)",
	background: "var(--color-background)",
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
	minHeight: 56,
	fontSize: 11,
	color: "var(--color-text-muted)",
	textDecoration: "none",
	WebkitTapHighlightColor: "transparent",
	transition: "transform var(--duration-fast) var(--ease-standard)",

	selectors: {
		'&[aria-current="page"]': {
			color: "var(--color-text)",
			fontWeight: "var(--font-weight-bold)",
		},
		"&:active": { transform: "scale(0.94)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
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
	gap: 2,
});

// 選んでいる所は、塗りのアイコンと太字で示す（背景の飾りは付けない）。
export const sideItem = style({
	display: "flex",
	alignItems: "center",
	gap: 16,
	minHeight: 48,
	padding: "0 12px",
	borderRadius: 12,
	fontSize: 16,
	color: "var(--color-text-muted)",
	textDecoration: "none",

	selectors: {
		"&:hover": {
			background: "var(--color-surface-muted)",
			color: "var(--color-text)",
		},
		'&[aria-current="page"]': {
			color: "var(--color-text)",
			fontWeight: "var(--font-weight-bold)",
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
	borderRadius: 12,
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
