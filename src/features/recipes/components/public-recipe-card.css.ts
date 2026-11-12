import { style } from "@vanilla-extract/css";

// 狭い幅（この欄の幅で決める）：カードを1列にし、絵を左、文字を右に置く（2列だと、名前と材料が細く折れる）。
const narrowWidth = "(max-width: 479px)";

// みんなのレシピのカードを並べる格子（この欄の幅で、1列／2列／3列）。同じ段のカードは、高さをそろえる。
// 互い違いの並び（columns）にしない：新しい順が縦に流れて読めず、「もっと見る」で既存のカードが別の列へ動くため。
export const grid = style({
	display: "grid",
	gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
	gap: 12,
	margin: 0,
	padding: 0,
	listStyle: "none",
	"@container": {
		[narrowWidth]: { gridTemplateColumns: "minmax(0, 1fr)" },
		"(min-width: 600px)": {
			gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
			gap: 16,
		},
	},
});

// カード全体が押せる（名前のリンクの範囲を、カードいっぱいに広げる）。
// 段の高さまで伸ばし、絵の下の文字の欄が、残りの高さを取る（作者とタグは、その下端）。
export const card = style({
	position: "relative",
	display: "grid",
	gridTemplateRows: "auto 1fr",
	overflow: "hidden",
	background: "var(--color-surface)",
	borderRadius: "var(--radius-card)",
	boxShadow: "var(--shadow-sm)",
	transition:
		"box-shadow var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)",
	selectors: {
		"&:hover": {
			boxShadow: "var(--shadow-md)",
			transform: "translateY(-2px)",
		},
		"&:has(:focus-visible)": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
	"@media": {
		"(prefers-reduced-motion: reduce)": {
			transition: "none",
			selectors: { "&:hover": { transform: "none" } },
		},
	},
	"@container": {
		[narrowWidth]: {
			gridTemplateColumns: "112px minmax(0, 1fr)",
			gridTemplateRows: "auto",
		},
	},
});

// 料理の絵を、薄い黄色の面の真ん中に、大きめに。
export const art = style({
	position: "relative",
	display: "grid",
	placeItems: "center",
	paddingBlock: 16,
	background: "var(--color-primary-soft)",
	"@container": {
		[narrowWidth]: { paddingBlock: 12 },
	},
});

// 何人分（絵の左上に、小さく）。
export const yieldBadge = style({
	position: "absolute",
	top: 8,
	left: 8,
	padding: "2px 8px",
	color: "var(--color-text)",
	fontSize: "var(--font-size-xs)",
	fontWeight: "var(--font-weight-semibold)",
	background: "var(--color-surface)",
	borderRadius: 9999,
});

// 名前・材料は上から、作者とタグは下端に寄せる（同じ段のカードで、下の行の位置がそろう）。
export const body = style({
	display: "flex",
	flexDirection: "column",
	gap: 6,
	padding: "10px 12px 12px",
	minWidth: 0,
});

export const footer = style({
	display: "grid",
	gap: 6,
	marginTop: "auto",
	paddingTop: 2,
});

export const link = style({
	color: "inherit",
	textDecoration: "none",
	outline: "none",
	selectors: {
		"&::after": { content: '""', position: "absolute", inset: 0 },
	},
});

const clamp = (lines: number) =>
	({
		display: "-webkit-box",
		overflow: "hidden",
		WebkitBoxOrient: "vertical",
		WebkitLineClamp: lines,
	}) as const;

export const name = style({
	...clamp(2),
	margin: 0,
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-bold)",
	lineHeight: "var(--line-height-tight)",
	overflowWrap: "anywhere",
});

export const ingredients = style({
	...clamp(2),
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
	lineHeight: "var(--line-height-normal)",
	overflowWrap: "anywhere",
});

export const author = style({
	display: "flex",
	alignItems: "center",
	gap: 6,
	minWidth: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
});

export const authorName = style({
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
});

export const tags = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 4,
});
