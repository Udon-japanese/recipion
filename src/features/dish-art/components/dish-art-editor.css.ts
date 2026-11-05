import { style } from "@vanilla-extract/css";

// 中画面から（広いモーダルの中）は、左に絵、右に部品を並べる。
const wide = "screen and (min-width: 768px)";

export const container = style({
	position: "relative",
	display: "grid",
	gap: 28,
	color: "var(--color-text)",
	"@media": {
		[wide]: {
			gridTemplateColumns: "minmax(0, 1.15fr) minmax(0, 1fr)",
			gap: 24,
			alignItems: "start",
		},
	},
});

// 絵と、その上下の操作。
export const stage = style({
	display: "grid",
	gap: 20,
	justifyItems: "center",
	"@media": { [wide]: { position: "sticky", top: 0 } },
});

// 部品を選ぶ側。
export const side = style({
	display: "grid",
	gap: 16,
	alignContent: "start",
	"@media": {
		[wide]: {
			maxHeight: "min(68dvh, 640px)",
			overflowY: "auto",
			paddingInlineEnd: 4,
		},
	},
});

export const canvasFrame = style({
	display: "grid",
	width: "min(100%, 340px)",
	borderRadius: 16,
	outline: "none",
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
	"@media": { [wide]: { width: "min(100%, 520px)" } },
});

// 絵を置く正方形。指で部品を動かすので、スクロールにならないようにする。
export const canvas = style({
	boxSizing: "border-box",
	display: "block",
	width: "100%",
	aspectRatio: "1",
	overflow: "hidden",
	borderRadius: 16,
	border: "1px solid var(--color-border)",
	background: "var(--color-primary-soft)",
	touchAction: "none",
	userSelect: "none",
	WebkitUserSelect: "none",
});

// 絵と同じ幅で、見出しとボタンを左に揃える。
export const group = style({
	display: "grid",
	justifyItems: "start",
	gap: 10,
	width: "min(100%, 340px)",
	"@media": { [wide]: { width: "min(100%, 520px)" } },
});

export const groupTitle = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
	fontWeight: "var(--font-weight-semibold)",
});

export const toolbar = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 12,
});

// 選んだ部品の操作（反転・複製・重なり・色）。
export const contextBar = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 12,
});

// 枠のつまみ（押せる範囲は、透明な大きめの円）。
export const rotateHandle = style({ cursor: "grab" });

export const scaleHandle = style({ cursor: "nwse-resize" });

export const deleteHandle = style({ cursor: "pointer" });

export const swatchGroup = style({
	display: "grid",
	justifyItems: "start",
	gap: 10,
	marginBlockStart: 8,
	// 色を選べる部品とそうでない部品で、高さが変わらないようにする（見出し＋スウォッチ32px＋余白）。
	minHeight: 64,
	alignContent: "start",
});

export const swatchNote = style({
	margin: 0,
	display: "flex",
	alignItems: "center",
	minHeight: 32,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const swatches = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 12,
});

export const swatch = style({
	boxSizing: "border-box",
	width: 32,
	height: 32,
	borderRadius: "50%",
	border: "2px solid var(--color-border)",
	selectors: {
		'&[aria-pressed="true"]': { borderColor: "var(--color-border-strong)" },
	},
});

export const categoryTabs = style({
	display: "flex",
	gap: 10,
	overflowX: "auto",
	paddingBlockEnd: 4,
});

export const categoryTab = style({
	boxSizing: "border-box",
	flexShrink: 0,
	minHeight: 36,
	paddingInline: 14,
	borderRadius: 18,
	border: "1px solid var(--color-control-border)",
	background: "var(--color-surface)",
	color: "var(--color-text)",
	fontSize: "var(--font-size-sm)",
	selectors: {
		'&[aria-pressed="true"]': {
			background: "var(--color-primary-soft)",
			borderColor: "var(--color-border-strong)",
			fontWeight: "var(--font-weight-bold)",
		},
	},
});

export const shelf = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(76px, 1fr))",
	gap: 12,
});

export const shelfItem = style({
	boxSizing: "border-box",
	display: "grid",
	justifyItems: "center",
	gap: 2,
	padding: 6,
	borderRadius: 12,
	border: "1px solid var(--color-border)",
	background: "var(--color-surface)",
	color: "var(--color-text)",
	fontSize: "var(--font-size-xs)",
	cursor: "grab",
});

export const presets = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(96px, 1fr))",
	gap: 12,
});

export const preset = style({
	boxSizing: "border-box",
	display: "grid",
	justifyItems: "center",
	gap: 4,
	padding: 8,
	borderRadius: 12,
	border: "1px solid var(--color-border)",
	background: "var(--color-surface)",
	color: "var(--color-text)",
	fontSize: "var(--font-size-xs)",
});

// 部品の範囲を測るための、見えない絵（画面には出さないが、描画はされている）。
export const measure = style({
	position: "absolute",
	width: 100,
	height: 100,
	left: -9999,
	top: 0,
	opacity: 0,
	pointerEvents: "none",
});

// 棚からマウスで運んでいる部品（指の位置に付いてくる）。
export const carried = style({
	position: "fixed",
	zIndex: 1000,
	pointerEvents: "none",
	transform: "translate(-50%, -50%)",
	opacity: 0.85,
});

// レシピの編集画面の「料理の絵」の入り口（絵だけ。右上に鉛筆）。
export const entry = style({
	position: "relative",
	flexShrink: 0,
	boxSizing: "border-box",
	display: "grid",
	width: 104,
	height: 104,
	padding: 0,
	border: "1px solid var(--color-border)",
	borderRadius: 20,
	background: "var(--color-primary-soft)",
	cursor: "pointer",
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const entryArt = style({
	display: "grid",
	overflow: "hidden",
	borderRadius: 19,
});

// 絵の右上の、編集の印（押す先は、絵全体）。
export const entryBadge = style({
	position: "absolute",
	top: -8,
	right: -8,
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

// シートの下の操作（右寄せ）。
export const sheetFooter = style({
	display: "flex",
	justifyContent: "flex-end",
	gap: 12,
	width: "100%",
});
