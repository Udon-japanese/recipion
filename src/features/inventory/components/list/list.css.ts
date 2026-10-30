import { globalStyle, keyframes, style } from "@vanilla-extract/css";

const glow = keyframes({
	"0%": { boxShadow: "0 0 0 0 var(--color-primary)" },
	"100%": { boxShadow: "0 0 0 8px transparent" },
});

export const wrap = style({ display: "grid", gap: 12, minWidth: 0 });

export const head = style({
	display: "flex",
	alignItems: "center",
	gap: 12,
});

export const grow = style({ flex: 1, minWidth: 0 });

export const body = style({
	display: "flex",
	alignItems: "flex-start",
	gap: 8,
});

export const main = style({
	display: "grid",
	gap: 12,
	flex: 1,
	minWidth: 0,
});

// 横に並べる絞り込み（はみ出したら、横にスクロール）。枠・フォーカスの輪が欠けないよう、余白を足す。
export const chipScroll = style({
	flexShrink: 0,
	overflowX: "auto",
	padding: 4,
	margin: -4,
});

globalStyle(`${chipScroll} fieldset`, {
	flexWrap: "nowrap",
	width: "max-content",
});

// 場所の縦タブ。
export const zoneTabs = style({
	display: "flex",
	flexDirection: "column",
	flexShrink: 0,
	position: "sticky",
	top: 8,
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

// 一覧の1行。区切り線だけ。
export const row = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 12,
	width: "100%",
	minHeight: 72,
	padding: "8px 12px 8px 8px",
	border: 0,
	borderTop: "1px solid var(--color-border)",
	background: "transparent",
	color: "var(--color-text)",
	font: "inherit",
	textAlign: "left",
	cursor: "pointer",
	selectors: {
		"&:hover": { background: "var(--color-surface-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
		},
		'&[data-selected="true"]': { background: "var(--color-primary-soft)" },
		'&[data-added="true"]': { animation: `${glow} 1s ease-out 2` },
		'&[data-empty="true"]': { color: "var(--color-text-muted)" },
	},
});

globalStyle(`${rows} > li:first-child ${row}`, { borderTop: 0 });

export const art = style({
	display: "grid",
	placeItems: "center",
	flexShrink: 0,
	width: 56,
	height: 56,
	borderRadius: "var(--radius-image)",
	background: "var(--color-surface-muted)",
});

export const text = style({
	display: "grid",
	gap: 4,
	flex: 1,
	minWidth: 0,
});

export const name = style({
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-semibold)",
});

export const meta = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 6,
});

export const amount = style({
	fontSize: "var(--font-size-md)",
	color: "var(--color-text-muted)",
});

export const skeletonRows = style({
	display: "grid",
	gap: 8,
	padding: 12,
});

export const skeleton = style({
	height: 72,
	borderRadius: 16,
	background: "var(--color-surface-muted)",
	"@media": {
		"(prefers-reduced-motion: no-preference)": {
			animation: `${keyframes({ "50%": { opacity: 0.45 } })} 1.4s ease-in-out infinite`,
		},
	},
});
