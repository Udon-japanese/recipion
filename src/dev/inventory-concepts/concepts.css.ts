import { globalStyle, keyframes, style } from "@vanilla-extract/css";

// 在庫画面のUI案（/dev/inventory）。試作なので、色の一部は直接指定している。
// 実装に進めるときは、トークンに置き換える。

const pop = keyframes({
	from: { opacity: 0, transform: "translateY(6px) scale(0.96)" },
	to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

export const page = style({
	boxSizing: "border-box",
	display: "grid",
	gap: 16,
	maxWidth: 960,
	margin: "0 auto",
	padding: "16px 16px 96px",
});

export const devBar = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: "8px 16px",
	fontSize: 13,
	color: "var(--color-text-muted)",
});

export const devCheck = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 6,
});

export const caption = style({
	margin: 0,
	fontSize: 13,
	lineHeight: 1.6,
	color: "var(--color-text-muted)",
});

// ---------- マスコット（動きの試作） ----------

// ---------- おうち（A案） ----------

export const bubble = style({
	position: "relative",
	alignSelf: "start",
	justifySelf: "start",
	margin: 0,
	padding: "8px 14px",
	borderRadius: 16,
	background: "var(--color-surface)",
	border: "2px solid var(--color-border-strong)",
	fontSize: 14,
	fontWeight: 600,
	selectors: {
		"&::after": {
			content: '""',
			position: "absolute",
			left: 22,
			bottom: -8,
			width: 12,
			height: 12,
			background: "var(--color-surface)",
			borderRight: "2px solid var(--color-border-strong)",
			borderBottom: "2px solid var(--color-border-strong)",
			transform: "rotate(45deg)",
		},
	},
});

export const compartmentHead = style({
	display: "flex",
	alignItems: "center",
	gap: 6,
	width: "100%",
	paddingInlineEnd: 10,
	boxSizing: "border-box",
	fontSize: 14,
	fontWeight: 700,
});

export const compartmentCount = style({
	fontSize: 12,
	fontWeight: 500,
	color: "var(--color-text-muted)",
});

export const alertPill = style({
	marginInlineStart: "auto",
	display: "inline-flex",
	alignItems: "center",
	gap: 2,
	padding: "2px 8px 2px 6px",
	borderRadius: 999,
	background: "var(--color-error-soft)",
	color: "var(--color-error)",
	fontSize: 12,
	fontWeight: 700,
	zIndex: 1,
});

// ---------- 庫内（扉をあけたあと） ----------

export const interior = style({
	boxSizing: "border-box",
	position: "absolute",
	inset: "14cqw 3cqw 3cqw",
	zIndex: 6,
	display: "grid",
	gridTemplateRows: "auto auto auto minmax(0, 1fr)",
	gap: 10,
	padding: "14px 12px 0",
	border: "2px solid var(--color-border-strong)",
	borderRadius: 24,
	background: "var(--color-background)",
	boxShadow: "var(--shadow-md)",
	animation: `${pop} 320ms var(--ease-emphasized) both`,
});

export const interiorScroll = style({
	display: "grid",
	alignContent: "start",
	gap: 12,
	minHeight: 0,
	paddingBottom: 20,
	overflowY: "auto",
});

export const interiorTitle = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	margin: 0,
	fontSize: 18,
});

export const backButton = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 2,
	minHeight: 44,
	padding: "0 14px 0 8px",
	border: "2px solid var(--color-control-border)",
	borderRadius: 999,
	background: "var(--color-surface)",
	color: "var(--color-text)",
	font: "inherit",
	fontSize: 14,
	fontWeight: 700,
	cursor: "pointer",
});

export const toolbar = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 8,
});

export const toolbarGroup = style([
	toolbar,
	{ margin: 0, padding: 0, border: 0, minWidth: 0 },
]);

export const zoneChips = style({
	display: "flex",
	gap: 8,
	margin: 0,
	padding: "0 0 4px",
	border: 0,
	minWidth: 0,
	overflowX: "auto",
	flexWrap: "nowrap",
});

export const searchBox = style({
	boxSizing: "border-box",
	flex: "1 1 120px",
	minWidth: 0,
	height: 40,
	padding: "0 16px",
	border: "2px solid var(--color-control-border)",
	borderRadius: 999,
	background: "var(--color-surface)",
	color: "var(--color-text)",
	font: "inherit",
	fontSize: 16,
});

export const chip = style({
	flexShrink: 0,
	boxSizing: "border-box",
	minHeight: 36,
	padding: "0 14px",
	border: "2px solid var(--color-control-border)",
	borderRadius: 999,
	background: "var(--color-surface)",
	color: "var(--color-text)",
	font: "inherit",
	fontSize: 13,
	cursor: "pointer",
	selectors: {
		'&[aria-pressed="true"]': {
			borderColor: "var(--color-text)",
			background: "var(--color-primary-soft)",
			fontWeight: 700,
		},
	},
});

export const shelf = style({
	display: "grid",
	gap: 8,
	paddingBottom: 14,
	borderBottom: "6px solid var(--color-border-strong)",
	borderRadius: 3,
	boxShadow: "0 6px 6px -6px rgba(41, 39, 32, 0.25)",
});

export const shelfHeading = style({
	display: "flex",
	alignItems: "center",
	gap: 6,
	margin: 0,
	fontSize: 13,
	fontWeight: 700,
	color: "var(--color-text-muted)",
	selectors: { '&[data-alert="true"]': { color: "var(--color-error)" } },
});

export const shelfItems = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
	gap: 8,
	margin: 0,
	padding: 0,
	listStyle: "none",
	selectors: {
		'&[data-density="small"]': {
			gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
			gap: 6,
		},
	},
});

export const more = style({
	justifySelf: "start",
	minHeight: 36,
	padding: "0 14px",
	border: "2px dashed var(--color-control-border)",
	borderRadius: 999,
	background: "transparent",
	color: "var(--color-text)",
	font: "inherit",
	fontSize: 13,
	cursor: "pointer",
});

export const itemButton = style({
	boxSizing: "border-box",
	position: "relative",
	display: "grid",
	gap: 6,
	alignContent: "start",
	justifyItems: "start",
	width: "100%",
	minHeight: 120,
	padding: 10,
	border: "1.5px solid var(--color-border)",
	borderRadius: 18,
	background: "var(--color-surface)",
	boxShadow: "var(--shadow-sm)",
	color: "var(--color-text)",
	font: "inherit",
	textAlign: "left",
	cursor: "pointer",
	animation: `${pop} 260ms var(--ease-emphasized) both`,
	selectors: {
		"&:hover": { borderColor: "var(--color-border-strong)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-text)",
			outlineOffset: 2,
		},
		'&[data-selected="true"]': {
			borderColor: "var(--color-text)",
			background: "var(--color-primary-soft)",
		},
		'&[data-expiry="expired"]': {
			borderColor: "var(--color-error)",
			background: "var(--color-error-soft)",
		},
		'&[data-expiry="soon"]': { background: "var(--color-error-soft)" },
		'&[data-expiry="near"]': { background: "var(--color-warning-soft)" },
		'&[data-density="small"]': {
			gridAutoFlow: "column",
			gridTemplateColumns: "auto minmax(0, 1fr) auto auto",
			alignItems: "center",
			minHeight: 52,
			padding: "6px 12px 6px 6px",
			borderRadius: 16,
			gap: 10,
		},
	},
});

export const itemArt = style({
	display: "inline-grid",
	placeItems: "center",
	flexShrink: 0,
	borderRadius: 14,
	overflow: "hidden",
});

export const itemName = style({
	minWidth: 0,
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	fontSize: 15,
	fontWeight: 700,
});

export const itemAmount = style({
	fontSize: 13,
	color: "var(--color-text-muted)",
});

export const expiryBadge = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 2,
	justifySelf: "start",
	padding: "1px 8px 1px 5px",
	borderRadius: 999,
	fontSize: 12,
	fontWeight: 700,
	selectors: {
		'&[data-level="expired"]': {
			background: "var(--color-error)",
			color: "var(--color-on-error)",
		},
		'&[data-level="soon"]': {
			background: "var(--color-error-soft)",
			color: "var(--color-error)",
		},
		'&[data-level="near"]': {
			background: "var(--color-warning-soft)",
			color: "var(--color-warning)",
		},
	},
});

// ---------- リスト（B案） ----------

export const listWrap = style({ display: "grid", gap: 12 });

export const groupHeader = style({
	boxSizing: "border-box",
	position: "sticky",
	top: "var(--shell-header-height, 0px)",
	zIndex: 2,
	display: "flex",
	alignItems: "center",
	gap: 8,
	width: "100%",
	minHeight: 40,
	padding: "0 12px",
	border: 0,
	borderRadius: 12,
	background: "var(--color-surface-muted)",
	color: "var(--color-text)",
	font: "inherit",
	fontSize: 14,
	fontWeight: 700,
	textAlign: "left",
	cursor: "pointer",
});

export const rows = style({
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const row = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 12,
	width: "100%",
	minHeight: 56,
	padding: "6px 12px",
	border: 0,
	borderBottom: "1px solid var(--color-border)",
	background: "transparent",
	color: "var(--color-text)",
	font: "inherit",
	textAlign: "left",
	cursor: "pointer",
	selectors: {
		"&:hover": { background: "var(--color-surface-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-text)",
			outlineOffset: -3,
		},
		'&[data-selected="true"]': { background: "var(--color-primary-soft)" },
	},
});

export const rowMain = style({
	display: "grid",
	flex: 1,
	minWidth: 0,
	gap: 2,
});

export const rowSub = style({
	fontSize: 12,
	color: "var(--color-text-muted)",
});

export const zoneTag = style({
	padding: "1px 8px",
	borderRadius: 999,
	background: "var(--color-surface-muted)",
	fontSize: 12,
	color: "var(--color-text-muted)",
});

// ---------- パネル（C案：ドラッグで動かす） ----------

export const panelZone = style({
	boxSizing: "border-box",
	display: "grid",
	gap: 8,
	padding: 12,
	border: "2px solid var(--color-border-strong)",
	borderRadius: 20,
	background: "var(--color-surface-muted)",
	transition:
		"background var(--duration-fast), border-color var(--duration-fast)",
	selectors: {
		'&[data-drop="true"]': {
			borderColor: "var(--color-text)",
			background: "var(--color-primary-soft)",
			borderStyle: "dashed",
		},
	},
});

export const panelGrid = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))",
	gap: 8,
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const tileItem = style({
	position: "relative",
	minWidth: 0,
	selectors: {
		'&[data-dragging="true"]': { opacity: 0.3 },
		'&[data-drop-before="true"]::before': {
			content: '""',
			position: "absolute",
			left: -6,
			top: 0,
			bottom: 0,
			width: 4,
			borderRadius: 2,
			background: "var(--color-text)",
		},
	},
});

export const grip = style({
	position: "absolute",
	right: 2,
	top: 2,
	zIndex: 1,
	display: "grid",
	placeItems: "center",
	width: 36,
	height: 36,
	padding: 0,
	border: 0,
	borderRadius: 999,
	background: "transparent",
	color: "var(--color-text-muted)",
	cursor: "grab",
	touchAction: "none",
	selectors: {
		"&:hover": { background: "var(--color-surface-muted)" },
		"&:active": { cursor: "grabbing" },
	},
});

export const ghost = style({
	position: "fixed",
	zIndex: 100,
	width: 120,
	pointerEvents: "none",
	opacity: 0.92,
	transform: "translate(-50%, -50%) rotate(3deg)",
	boxShadow: "var(--shadow-md)",
	borderRadius: 14,
});

export const detail = style({
	position: "fixed",
	left: "50%",
	bottom: 16,
	zIndex: 20,
	display: "flex",
	alignItems: "center",
	gap: 12,
	width: "min(92vw, 420px)",
	boxSizing: "border-box",
	padding: "10px 12px 10px 16px",
	borderRadius: 20,
	background: "var(--color-surface)",
	boxShadow: "var(--shadow-md)",
	border: "2px solid var(--color-border-strong)",
	transform: "translateX(-50%)",
});

globalStyle(`${page} *, ${page} *::before, ${page} *::after`, {
	"@media": {
		"(prefers-reduced-motion: reduce)": {
			animation: "none !important",
			transition: "none !important",
		},
	},
});
