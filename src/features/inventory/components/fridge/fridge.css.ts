import { keyframes, style } from "@vanilla-extract/css";

// 冷蔵庫の絵は飾り。形・線・文字の3つで同じことを伝える（色だけに頼らない）。
// このアプリは box-sizing の全体のリセットがないので、寸法を持つ部品は border-box を明示する。

export const fridge = style({
	display: "grid",
	gap: 24,
	// 追加ボタン（56px）と下部ナビ（64px）に、最後のタイルが隠れない。
	paddingBottom: 152,
	"@media": {
		"(min-width: 768px)": { paddingBottom: 32 },
	},
});

// 冷蔵庫の本体（庫内の4ゾーン）。
export const body = style({
	boxSizing: "border-box",
	margin: 0,
	padding: 0,
	overflow: "clip",
	border: "2px solid var(--color-border-strong)",
	borderRadius: 24,
	background: "var(--color-surface-muted)",
	listStyle: "none",
});

export const zone = style({
	position: "relative",
	selectors: {
		"& + &": { borderTop: "2px solid var(--color-border-strong)" },
		'&[data-zone="freezer"]::before': {
			content: '""',
			position: "absolute",
			insetInline: 0,
			top: 36,
			borderTop: "2px dashed var(--color-border-strong)",
			pointerEvents: "none",
		},
	},
});

export const outsideZone = style({
	position: "relative",
});

export const zoneHeading = style({
	boxSizing: "border-box",
	position: "sticky",
	top: "var(--shell-header-height, 56px)",
	zIndex: 2,
	display: "flex",
	alignItems: "center",
	gap: 8,
	height: 36,
	margin: 0,
	paddingInline: 12,
	color: "var(--color-text)",
	background: "inherit",
	fontSize: 14,
	fontWeight: 700,
	lineHeight: 1,
});

export const zoneCount = style({
	marginInlineStart: "auto",
	color: "var(--color-text-muted)",
	fontWeight: 400,
});

export const tiles = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))",
	columnGap: 8,
	// 行の高さ 120px＝タイル 104px＋縦の間 16px。そのうち 4px が棚板。
	rowGap: 16,
	margin: 0,
	padding: "14px 12px 16px",
	listStyle: "none",
	selectors: {
		// ドアのポケットは、名前と「あり／なし」の札が並ぶので、少し幅を取る。
		'[data-zone="door"] > &': {
			gridAutoRows: 64,
			gridTemplateColumns: "repeat(auto-fill, minmax(136px, 1fr))",
		},
		'&[data-empty="true"]': { padding: 0 },
	},
	"@media": {
		"(min-width: 768px)": {
			gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
		},
	},
});

// 机の上。箱の外。太い天板の上に立つ。
export const tableTop = style({
	height: 8,
	marginInline: 12,
	borderRadius: 4,
	background: "var(--color-border-strong)",
	boxShadow: "var(--shadow-sm)",
});

// 野菜室・冷凍室の引き出しの取っ手。
export const handle = style({
	width: 48,
	height: 6,
	margin: "8px auto 10px",
	borderRadius: 3,
	background: "var(--color-border-strong)",
});

export const tileItem = style({
	position: "relative",
	minWidth: 0,
	selectors: {
		// 棚板：タイルの下に 4px。ドアのポケットには付けない。
		'[data-zone]:not([data-zone="door"]) &::after': {
			content: '""',
			position: "absolute",
			insetInline: -4,
			bottom: -8,
			height: 4,
			borderRadius: 2,
			background: "var(--color-border-strong)",
			pointerEvents: "none",
		},
	},
});

export const tile = style({
	boxSizing: "border-box",
	position: "relative",
	display: "flex",
	flexDirection: "column",
	alignItems: "flex-start",
	justifyContent: "space-between",
	width: "100%",
	height: 104,
	padding: "10px 8px 8px",
	color: "var(--color-text)",
	background: "var(--color-surface)",
	border: "1px solid var(--color-control-border)",
	borderRadius: 16,
	font: "inherit",
	textAlign: "start",
	cursor: "pointer",
	selectors: {
		"&:hover": {
			borderColor: "var(--color-border-strong)",
			boxShadow: "var(--shadow-sm)",
		},
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
		// 追加した直後：2px の輪を、短く出す（動きを減らす設定では、出しっぱなし）。
		"&[data-added]": {
			boxShadow: "0 0 0 2px var(--color-primary)",
		},
		// 開いている食材。
		'&[aria-expanded="true"], &[data-selected="true"]': {
			border: "2px solid var(--color-text)",
			padding: "9px 7px 7px",
		},
		'&[data-expiry="expired"]': {
			border: "2px solid var(--color-error)",
			padding: "9px 7px 7px",
		},
		'&[data-expiry="soon"]': {
			border: "2px solid var(--color-warning)",
			padding: "9px 7px 7px",
		},
		// 量が 0：枠が破線。
		"&[data-empty]": { borderStyle: "dashed" },
		// 重なり：背面に同じ形の枠を2枚、右下へ 4px ずつずらす。
		'&[data-lots="2"]': {
			boxShadow:
				"4px 4px 0 -1px var(--color-surface), 4px 4px 0 0 var(--color-control-border), 8px 8px 0 -1px var(--color-surface), 8px 8px 0 0 var(--color-control-border)",
		},
	},
	"@media": {
		"(min-width: 768px)": { height: 112 },
	},
});

// ドアのポケットのタイル（低い。有無だけで、量の絵が要らない）。
export const pocket = style([
	tile,
	{
		height: 64,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 6,
		padding: "0 10px",
		borderRadius: "6px 6px 16px 16px",
		"@media": { "(min-width: 768px)": { height: 64 } },
	},
]);

export const name = style({
	display: "-webkit-box",
	WebkitBoxOrient: "vertical",
	WebkitLineClamp: 2,
	overflow: "hidden",
	maxWidth: "100%",
	fontSize: 14,
	fontWeight: 600,
	lineHeight: 1.25,
	overflowWrap: "anywhere",
	zIndex: 1,
});

export const amount = style({
	fontSize: 14,
	fontWeight: 700,
	fontVariantNumeric: "tabular-nums",
	lineHeight: 1.2,
	zIndex: 1,
	selectors: {
		"[data-empty] &": {
			color: "var(--color-text-muted)",
			fontWeight: 400,
		},
	},
});

// 水位：タイルの下から、量の割合だけ満たす。はみ出さないよう、角丸の中に収める。
export const waterClip = style({
	position: "absolute",
	inset: 0,
	overflow: "hidden",
	borderRadius: "inherit",
	pointerEvents: "none",
});

export const water = style({
	position: "absolute",
	insetInline: 0,
	bottom: 0,
	height: "calc(var(--level) * 100%)",
	background: "var(--color-primary-soft-hover)",
});

// 水面：正確＝直線（2px）、約＝波線（波の高さ 2px、1波 24px）。
export const waterSurface = style({
	position: "absolute",
	insetInline: 0,
	top: 0,
	height: 2,
	background: "var(--color-primary)",
	selectors: {
		'&[data-approximate="true"]': {
			top: -2,
			height: 6,
			background:
				"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='6' viewBox='0 0 24 6'%3E%3Cpath d='M0 3 Q6 0.5 12 3 T24 3' fill='none' stroke='%23e9a900' stroke-width='2'/%3E%3C/svg%3E\") repeat-x 0 0 / 24px 6px",
		},
	},
});

// 目盛り（25・50・75%）。
export const waterTick = style({
	position: "absolute",
	right: 0,
	width: 6,
	height: 1.5,
	background: "var(--color-control-border)",
	bottom: "calc(var(--tick) * 100%)",
});

// 粒（卵のかたち）。1個＝1粒。
export const grains = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 4,
	width: 5 * 13 + 4 * 4,
	maxWidth: "100%",
	zIndex: 1,
});

export const grain = style({
	boxSizing: "border-box",
	width: 13,
	height: 12,
	background: "var(--color-primary)",
	border: "1.5px solid var(--color-accent-text)",
	borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
	selectors: {
		// 約＝破線の輪郭（中は塗る）。
		'&[data-approximate="true"]': { borderStyle: "dashed" },
		// 端数：最後の粒の一部だけ塗る。
		"&[data-partial]": {
			background:
				"linear-gradient(to right, var(--color-primary) var(--partial), var(--color-surface) var(--partial))",
		},
	},
});

// 期限の札：タイルの上の縁にまたがる。押せない（見るだけ）。
export const expiryBadge = style({
	boxSizing: "border-box",
	position: "absolute",
	top: -10,
	right: 8,
	zIndex: 3,
	display: "inline-flex",
	alignItems: "center",
	gap: 3,
	height: 22,
	paddingInline: 6,
	color: "var(--color-text)",
	background: "var(--color-warning-soft)",
	borderRadius: 9999,
	fontSize: 13,
	fontWeight: 700,
	lineHeight: 1,
	pointerEvents: "none",
	selectors: {
		'&[data-level="expired"]': { background: "var(--color-error-soft)" },
		// 目安（約）は、札の枠を破線にする。
		"&[data-approximate]": {
			outline: "1.5px dashed var(--color-text-muted)",
			outlineOffset: -1.5,
		},
	},
});

export const lotCount = style({
	boxSizing: "border-box",
	position: "absolute",
	right: 6,
	bottom: 6,
	zIndex: 3,
	display: "inline-flex",
	alignItems: "center",
	height: 20,
	paddingInline: 6,
	color: "var(--color-text)",
	background: "var(--color-surface)",
	borderRadius: 9999,
	fontSize: 13,
	fontWeight: 700,
	pointerEvents: "none",
});

// 有無だけの札：あり＝実線の枠＋✓、なし＝破線の枠＋✕＋薄い文字。
export const presenceTag = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 2,
	height: 26,
	paddingInline: 8,
	flexShrink: 0,
	border: "1.5px solid var(--color-text)",
	borderRadius: 9999,
	fontSize: 13,
	fontWeight: 700,
	selectors: {
		'&[data-present="false"]': {
			borderStyle: "dashed",
			borderColor: "var(--color-text-muted)",
			color: "var(--color-text-muted)",
			fontWeight: 400,
		},
	},
});

// 読み込み中：タイルの形の灰色の板。
export const skeleton = style({
	height: 104,
	borderRadius: 16,
	background: "var(--color-surface)",
	opacity: 0.7,
	"@media": {
		"(prefers-reduced-motion: no-preference)": {
			animation: `${keyframes({ "50%": { opacity: 0.35 } })} 1.4s ease-in-out infinite`,
		},
	},
});

export const srOnly = style({
	position: "absolute",
	width: 1,
	height: 1,
	overflow: "hidden",
	clip: "rect(0 0 0 0)",
	whiteSpace: "nowrap",
});

// 食材のパネルの量の絵（56px。タイルと同じ水位・粒）。
export const picture = style({
	boxSizing: "border-box",
	position: "relative",
	display: "flex",
	flexWrap: "wrap",
	alignContent: "center",
	justifyContent: "center",
	gap: 2,
	flex: "none",
	width: 56,
	height: 56,
	padding: 4,
	overflow: "hidden",
	background: "var(--color-surface)",
	border: "2px solid var(--color-border-strong)",
	borderRadius: 12,
});

export const pictureGrain = style({
	boxSizing: "border-box",
	width: 9,
	height: 8,
	background: "var(--color-primary)",
	border: "1px solid var(--color-accent-text)",
	borderRadius: "50% 50% 50% 50% / 60% 60% 40% 40%",
	selectors: {
		'&[data-approximate="true"]': { borderStyle: "dashed" },
		"&[data-partial]": {
			background:
				"linear-gradient(to right, var(--color-primary) var(--partial), var(--color-surface) var(--partial))",
		},
	},
});
