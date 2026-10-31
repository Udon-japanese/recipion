import { globalStyle, keyframes, style } from "@vanilla-extract/css";

const glow = keyframes({
	"0%": { boxShadow: "0 0 0 0 var(--color-primary)" },
	"100%": { boxShadow: "0 0 0 8px transparent" },
});

const wide = "(min-width: 768px)";

export const wrap = style({ display: "grid", gap: 20, minWidth: 0 });

// 上の操作：PC は1段（切り替え・検索・まとめ方・更新・追加）。スマホは、検索とまとめ方を2段目に。
export const toolbar = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 8,
});

export const search = style({
	display: "flex",
	gap: 8,
	order: 1,
	flexBasis: "100%",
	minWidth: 0,
	"@media": {
		[wide]: { order: 0, flex: 1, flexBasis: "auto" },
	},
});

// 更新などは、右に寄せる（スマホでは、1段目の右端）。
globalStyle(`${toolbar} [data-tools]`, { marginInlineStart: "auto" });

export const searchField = style({ flex: 1, minWidth: 0 });

export const groupBy = style({ flexShrink: 0, width: 136 });

// 「早めに使う」：期限が近い食材を、大きめのカードで（最大3件）。
export const useSoonHead = style({
	margin: "0 0 8px",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
	color: "var(--color-warning)",
});

export const useSoon = style({
	display: "grid",
	gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
	gap: 8,
	margin: 0,
	padding: 0,
	listStyle: "none",
	"@media": {
		[wide]: { gridTemplateColumns: "repeat(3, minmax(0, 220px))" },
	},
});

export const useSoonCard = style({
	boxSizing: "border-box",
	display: "grid",
	justifyItems: "start",
	gap: 4,
	width: "100%",
	height: "100%",
	padding: 10,
	border: 0,
	borderRadius: 16,
	background: "var(--color-warning-soft)",
	color: "var(--color-text)",
	font: "inherit",
	textAlign: "left",
	cursor: "pointer",
	transition: "transform var(--duration-fast) var(--ease-standard)",
	selectors: {
		// 行の札と同じく、今日・明日と切れは赤み。
		'&[data-expiry="expired"], &[data-expiry="soon"]': {
			background: "var(--color-error-soft)",
		},
		"&:active": { transform: "scale(0.97)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const useSoonName = style({
	maxWidth: "100%",
	overflow: "hidden",
	textOverflow: "ellipsis",
	whiteSpace: "nowrap",
	fontWeight: "var(--font-weight-bold)",
});

export const useSoonWhen = style({
	fontSize: "var(--font-size-xl)",
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: 1.1,
	fontVariantNumeric: "tabular-nums",
	color: "var(--color-warning)",
	selectors: {
		[`${useSoonCard}[data-expiry="expired"] &, ${useSoonCard}[data-expiry="soon"] &`]:
			{
				color: "var(--color-error)",
			},
	},
});

export const useSoonSmall = style({
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
});

// まとめ方ごとの区切り：墨の下線を引いた見出し。
export const section = style({ display: "grid", minWidth: 0 });

export const sectionHead = style({
	display: "flex",
	alignItems: "center",
	gap: 6,
	margin: 0,
	paddingBottom: 6,
	borderBottom: "2px solid var(--color-text)",
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-extrabold)",
});

export const sectionCount = style({
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-regular)",
	color: "var(--color-text-muted)",
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

// 行の並び：PC は2列。
export const rows = style({
	display: "grid",
	columnGap: 24,
	margin: 0,
	padding: 0,
	listStyle: "none",
	"@media": {
		[wide]: { gridTemplateColumns: "repeat(2, minmax(0, 1fr))" },
	},
});

export const empty = style({
	margin: 0,
	padding: 24,
	textAlign: "center",
	color: "var(--color-text-muted)",
});

// 一覧の1行。下に区切り線だけ。
export const row = style({
	boxSizing: "border-box",
	display: "flex",
	alignItems: "center",
	gap: 12,
	width: "100%",
	minHeight: 64,
	padding: "6px 4px",
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
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
		},
		'&[data-selected="true"]': { background: "var(--color-primary-soft)" },
		'&[data-added="true"]': { animation: `${glow} 1s ease-out 2` },
		'&[data-empty="true"]': { color: "var(--color-text-muted)" },
	},
});

// 食材の絵（台は敷かない）。
export const art = style({
	display: "grid",
	placeItems: "center",
	flexShrink: 0,
	width: 48,
	height: 48,
});

globalStyle(`${row}[data-empty="true"] ${art}`, { opacity: 0.45 });

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
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-bold)",
});

export const meta = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 6,
});

export const zone = style({
	fontSize: "var(--font-size-sm)",
	color: "var(--color-text-muted)",
});

// 量：右に、数字を大きく（桁の幅をそろえる）。単位と「約」は小さく。
export const quantity = style({
	display: "flex",
	alignItems: "baseline",
	gap: 2,
	flexShrink: 0,
	whiteSpace: "nowrap",
});

export const amount = style({
	fontSize: "var(--font-size-xl)",
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: 1,
	fontVariantNumeric: "tabular-nums",
});

export const unit = style({
	fontSize: "var(--font-size-sm)",
	color: "var(--color-text-muted)",
});

export const none = style({
	fontSize: "var(--font-size-sm)",
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
