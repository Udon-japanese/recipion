import { style } from "@vanilla-extract/css";

const PC = "(min-width: 768px)";

export const page = style({
	display: "grid",
	alignContent: "start",
	gap: 16,
	// スマホ：購入確定のバーが、画面の下（ナビの上）にそろうよう、高さを確保する。
	minHeight: "calc(100dvh - 56px - 64px - 32px)",
	maxWidth: 720,
	marginInline: "auto",
	minWidth: 0,
});

export const titleRow = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 12,
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-xl)",
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: 1.35,
	"@media": {
		// スマホは、ヘッダーに名前があるので、見出しは見えなくする。
		"(max-width: 767px)": {
			position: "absolute",
			width: 1,
			height: 1,
			overflow: "hidden",
			clip: "rect(0 0 0 0)",
			whiteSpace: "nowrap",
		},
	},
});

// 表示の切り替えと、並べ替えのボタン。
export const toolbar = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	flex: 1,
	minWidth: 0,
	"@media": {
		[PC]: { flex: "none", width: 320 },
	},
});

export const toolbarSegment = style({
	flex: 1,
	minWidth: 0,
});

// 追加の入力（折りたたみ時は1行、開くとカード）。
export const addForm = style({
	display: "grid",
	gap: 14,
	selectors: {
		'&[data-expanded="true"]': {
			padding: 16,
			background: "var(--color-surface)",
			borderRadius: "var(--radius-card)",
			boxShadow: "var(--shadow-sm)",
		},
	},
});

export const addNameRow = style({
	display: "flex",
	alignItems: "flex-start",
	gap: 8,
});

export const grow = style({
	flex: 1,
	minWidth: 0,
});

export const two = style({
	display: "flex",
	gap: 12,
	alignItems: "flex-start",
});

export const unitField = style({
	flex: "none",
	width: 120,
});

export const chips = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
});

export const groupLabel = style({
	margin: 0,
	padding: 0,
	border: 0,
	display: "grid",
	gap: 8,
	minWidth: 0,
});

export const groupLegend = style({
	padding: 0,
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
	lineHeight: 1.35,
});

export const inlineStore = style({
	display: "grid",
	gap: 12,
	marginTop: 8,
	padding: 12,
	background: "var(--color-surface-muted)",
	borderRadius: 16,
});

export const inlineStoreButtons = style({
	display: "flex",
	gap: 8,
});

export const formError = style({
	margin: 0,
	display: "flex",
	alignItems: "center",
	gap: 8,
	color: "var(--color-error)",
	fontSize: "var(--font-size-sm)",
});

// 読み込み中・空：れしぴょんと一言。
export const center = style({
	display: "grid",
	justifyItems: "center",
	gap: 12,
	padding: "32px 16px",
	color: "var(--color-text-muted)",
	textAlign: "center",
});

export const centerText = style({ margin: 0 });

export const groups = style({
	display: "grid",
	gap: 16,
	margin: 0,
	padding: 0,
});

export const groupHeader = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 8,
	minHeight: 40,
	padding: "0 4px",
});

export const groupTitle = style({
	margin: 0,
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
	color: "var(--color-text-muted)",
});

export const listCard = style({
	margin: 0,
	padding: "0 12px 0 8px",
	listStyle: "none",
	background: "var(--color-surface)",
	borderRadius: "var(--radius-card)",
	boxShadow: "var(--shadow-sm)",
});

// 編集中の行。
export const editRow = style({
	listStyle: "none",
	padding: "4px 0",
	borderTop: "1px solid var(--color-border)",
	selectors: {
		"&:first-child": { borderTop: 0 },
	},
});

export const editCard = style({
	display: "grid",
	gap: 14,
	margin: "8px 0",
	padding: 16,
	background: "var(--color-surface)",
	border: "2px solid var(--color-text)",
	borderRadius: "var(--radius-card)",
});

export const editButtons = style({
	display: "flex",
	gap: 8,
});

export const storeFilter = style({
	display: "grid",
	gap: 8,
});

export const sheetBody = style({
	display: "grid",
	gap: 14,
	padding: "4px 0 8px",
});

export const sheetHint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: 1.55,
});

export const sheetButtons = style({
	display: "flex",
	gap: 12,
});

export const converted = style({
	color: "var(--color-text-muted)",
	whiteSpace: "nowrap",
});

export const doneTags = style({
	display: "contents",
	selectors: {
		'&[data-done="true"]': { opacity: 0.6 },
	},
});

export const draggingHandle = style({
	touchAction: "none",
	cursor: "grab",
});

// 購入確定のバー。スマホは下のナビの上に、PC は画面の下に貼り付く。
export const purchaseBar = style({
	alignSelf: "end",
	position: "sticky",
	bottom: "calc(64px + env(safe-area-inset-bottom))",
	zIndex: 5,
	margin: "0 -16px -16px",
	padding: "12px 16px",
	background: "var(--color-surface)",
	borderTop: "1px solid var(--color-border)",
	boxShadow: "var(--shadow-sheet)",
	"@media": {
		[PC]: {
			bottom: 16,
			margin: "8px 0 0",
			borderTop: 0,
			borderRadius: "var(--radius-card)",
			boxShadow: "var(--shadow-md)",
		},
	},
});

export const purchaseCount = style({
	display: "inline-grid",
	placeItems: "center",
	minWidth: 28,
	height: 28,
	padding: "0 8px",
	borderRadius: 9999,
	background: "var(--color-on-primary)",
	color: "var(--color-primary)",
	fontSize: 14,
});
