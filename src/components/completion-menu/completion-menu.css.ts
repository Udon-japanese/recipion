import { style } from "@vanilla-extract/css";

// 補完の候補は、画面の上に固定して出す（シートや、スクロールする枠の中にあっても、切れないように）。
// メニュー（30）・確認のダイアログ（30）より、上。
const layer = 40;

// PC：カーソルの近くに出す、縦の一覧（メニューと同じ、白い丸角のカード）。
export const popup = style({
	position: "fixed",
	zIndex: layer,
	display: "grid",
	// 高さを縮めるとき（上に置くため）は、一覧が縮んで、中でスクロールする。
	gridTemplateRows: "minmax(0, 1fr) auto",
	gap: 4,
	minWidth: 180,
	maxWidth: "min(360px, 90vw)",
	padding: 4,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 16,
	boxShadow: "var(--shadow-md)",
});

export const popupList = style({
	display: "grid",
	gap: 2,
	maxHeight: 264,
	minHeight: 0,
	margin: 0,
	padding: 0,
	overflowY: "auto",
	listStyle: "none",
});

export const popupItem = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 6,
	width: "100%",
	minHeight: 40,
	padding: "0 12px",
	color: "var(--color-text)",
	font: "inherit",
	fontWeight: "var(--font-weight-medium)",
	textAlign: "left",
	background: "transparent",
	border: "none",
	borderRadius: 12,
	cursor: "pointer",
	selectors: {
		"&:hover": { background: "var(--color-surface-muted)" },
		'&[aria-current="true"]': {
			background: "var(--color-primary-soft)",
			fontWeight: "var(--font-weight-bold)",
		},
	},
});

export const popupHint = style({
	margin: 0,
	padding: "6px 12px 4px",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
	borderTop: "1px solid var(--color-border)",
});

// 候補が出ないときの理由（探している最中・見つからない・失敗）。
export const notice = style({
	display: "block",
	margin: 0,
	padding: "8px 12px",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

// スマホ：キーボードのすぐ上に固定する、横に並べた帯（横にスクロールできる）。
export const bar = style({
	position: "fixed",
	left: 0,
	right: 0,
	zIndex: layer,
	padding: "8px 12px",
	background: "var(--color-surface)",
	borderTop: "1px solid var(--color-border)",
	boxShadow: "var(--shadow-sheet)",
});

export const barList = style({
	display: "flex",
	gap: 8,
	margin: 0,
	padding: 0,
	overflowX: "auto",
	listStyle: "none",
	whiteSpace: "nowrap",
	WebkitOverflowScrolling: "touch",
});

export const barItem = style({
	flexShrink: 0,
	display: "inline-flex",
	alignItems: "center",
	gap: 6,
	minHeight: 40,
	padding: "0 16px",
	color: "var(--color-text)",
	font: "inherit",
	fontWeight: "var(--font-weight-medium)",
	background: "var(--color-surface)",
	border: "1.5px solid var(--color-control-border)",
	borderRadius: "var(--radius-control)",
	cursor: "pointer",
	selectors: {
		'&[aria-current="true"]': {
			background: "var(--color-primary-soft)",
			borderColor: "var(--color-text)",
			fontWeight: "var(--font-weight-bold)",
		},
	},
});

// 候補の種類の印（例：「店」）。
export const badge = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
	fontWeight: "var(--font-weight-regular)",
});
