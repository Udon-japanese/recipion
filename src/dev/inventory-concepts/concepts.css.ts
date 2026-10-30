import { globalStyle, keyframes, style } from "@vanilla-extract/css";

// 在庫画面のUI案（/dev/inventory）の、まわりの部品。色は、すべてトークンを使う。
const pop = keyframes({
	from: { opacity: 0, transform: "translateY(6px) scale(0.98)" },
	to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

export const page = style({
	boxSizing: "border-box",
	display: "grid",
	gap: 12,
	maxWidth: 960,
	margin: "0 auto",
	padding: "12px 16px 96px",
});

export const devBar = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: "4px 16px",
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
	fontSize: "var(--font-size-sm)",
	color: "var(--color-text-muted)",
});

// 表示の切り替え（丸いボタンが2つ）。
export const viewToggle = style({
	display: "inline-flex",
	gap: 4,
	margin: 0,
	padding: 4,
	border: 0,
	borderRadius: 9999,
	background: "var(--color-surface)",
	boxShadow: "var(--shadow-sm)",
});

// ---------- 場所の縦タブ ----------

export const zoneTabs = style({
	display: "flex",
	flexDirection: "column",
	flexShrink: 0,
	alignSelf: "flex-start",
	gap: 6,
	margin: 0,
	padding: 0,
	border: 0,
	minWidth: 0,
});

export const zoneTab = style({
	boxSizing: "border-box",
	display: "grid",
	justifyItems: "center",
	gap: 2,
	width: 64,
	padding: "8px 2px",
	border: "1.5px solid var(--color-control-border)",
	borderRadius: 16,
	background: "var(--color-surface)",
	color: "var(--color-text)",
	font: "inherit",
	fontSize: 12,
	fontWeight: "var(--font-weight-semibold)",
	lineHeight: 1.25,
	cursor: "pointer",
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
		'&[aria-pressed="true"]': {
			borderColor: "var(--color-text)",
			background: "var(--color-primary-soft)",
			boxShadow: "0 0 0 1px var(--color-text)",
		},
	},
});

export const zoneTabCount = style({
	fontSize: 11,
	fontWeight: "var(--font-weight-regular)",
	color: "var(--color-text-muted)",
});

// リスト：縦タブ＋一覧を横に並べる。
export const listBody = style({
	display: "flex",
	alignItems: "flex-start",
	gap: 8,
});

export const listMain = style({
	display: "grid",
	gap: 12,
	flex: 1,
	minWidth: 0,
});

// ---------- 庫内（ズームしたあと） ----------

// 庫内：左の縦タブと、パネルを横に並べる。
export const interiorWrap = style({
	boxSizing: "border-box",
	position: "absolute",
	inset: "14cqw 3cqw 3cqw",
	zIndex: 6,
	display: "flex",
	alignItems: "stretch",
	gap: 6,
	// 空いたところは、外側として押せるようにする。
	pointerEvents: "none",
});

globalStyle(`${interiorWrap} > *`, { pointerEvents: "auto" });

export const interior = style({
	boxSizing: "border-box",
	position: "relative",
	flex: 1,
	minWidth: 0,
	outline: "none",
	display: "flex",
	flexDirection: "column",
	gap: 12,
	padding: "12px 12px 0",
	border: "2px solid var(--color-border-strong)",
	borderRadius: "var(--radius-sheet)",
	background: "var(--color-background)",
	boxShadow: "var(--shadow-md)",
	animation: `${pop} 320ms var(--ease-emphasized) both`,
});

export const interiorHead = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	margin: 0,
	fontSize: "var(--font-size-lg)",
});

export const count = style({
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-regular)",
	color: "var(--color-text-muted)",
});

// 横に並べる絞り込み（はみ出したら、横にスクロール）。
export const chipScroll = style({
	flexShrink: 0,
	overflowX: "auto",
	// 枠・影・フォーカスの輪が、スクロール領域の縁で削れないように、余白を足す。
	padding: 4,
	margin: -4,
});

// 中のチップの並びは、折り返さず、横に伸ばす。
globalStyle(`${chipScroll} fieldset`, {
	flexWrap: "nowrap",
	width: "max-content",
});

export const searchRow = style({
	display: "flex",
	flexShrink: 0,
	alignItems: "center",
	gap: 8,
});

export const searchGrow = style({ flex: 1, minWidth: 0 });

export const interiorScroll = style({
	display: "grid",
	alignContent: "start",
	gap: 12,
	flex: 1,
	minHeight: 0,
	paddingBottom: 20,
	overflowY: "auto",
});

export const shelf = style({
	display: "grid",
	gap: 8,
	padding: 12,
	borderRadius: "var(--radius-card)",
	background: "var(--color-surface)",
	boxShadow: "var(--shadow-sm)",
});

export const shelfHeading = style({
	display: "flex",
	alignItems: "center",
	gap: 6,
	margin: 0,
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
	color: "var(--color-text-muted)",
	selectors: { '&[data-alert="true"]': { color: "var(--color-error)" } },
});

export const shelfItems = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
	gap: 8,
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const moreRow = style({ display: "flex" });

// ---------- 食材の1件 ----------

export const item = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 12,
	width: "100%",
	minHeight: 72,
	padding: "8px 12px 8px 8px",
	border: "1.5px solid var(--color-border)",
	borderRadius: 16,
	background: "var(--color-surface)",
	color: "var(--color-text)",
	font: "inherit",
	textAlign: "left",
	cursor: "pointer",
	animation: `${pop} 240ms var(--ease-emphasized) both`,
	selectors: {
		"&:hover": { borderColor: "var(--color-border-strong)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
		'&[data-selected="true"]': {
			borderColor: "var(--color-text)",
			background: "var(--color-primary-soft)",
		},
		// 一覧の行：枠と角丸をなくし、区切り線だけにする。
		'&[data-variant="row"]': {
			border: 0,
			borderTop: "1px solid var(--color-border)",
			borderRadius: 0,
			background: "transparent",
			animation: "none",
		},
		'&[data-variant="row"][data-selected="true"]': {
			background: "var(--color-primary-soft)",
		},
	},
});

export const itemArt = style({
	display: "grid",
	placeItems: "center",
	flexShrink: 0,
	width: 56,
	height: 56,
	borderRadius: "var(--radius-image)",
	background: "var(--color-surface-muted)",
});

export const itemText = style({
	display: "grid",
	gap: 4,
	flex: 1,
	minWidth: 0,
});

export const itemName = style({
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-semibold)",
});

export const itemMeta = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 6,
});

export const itemAmount = style({
	fontSize: "var(--font-size-md)",
	color: "var(--color-text-muted)",
});

// ---------- リスト ----------

export const listWrap = style({ display: "grid", gap: 12 });

export const listHead = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 12,
});

export const rows = style({
	margin: 0,
	padding: "4px 0",
	listStyle: "none",
});

export const empty = style({
	margin: 0,
	padding: 24,
	textAlign: "center",
	color: "var(--color-text-muted)",
});

// ---------- 詳細（見本） ----------

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
	borderRadius: "var(--radius-card)",
	background: "var(--color-surface)",
	boxShadow: "var(--shadow-md)",
	border: "2px solid var(--color-border-strong)",
	transform: "translateX(-50%)",
});
