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
		'&[data-expanded="true"]:not([data-bare])': {
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

// 分類ごとのカード（条件つきのメモのブロックと、行の一覧が入る）。
export const categoryCard = style({
	margin: 0,
	overflow: "hidden",
	background: "var(--color-surface)",
	borderRadius: "var(--radius-card)",
	boxShadow: "var(--shadow-sm)",
});

export const rowList = style({
	margin: 0,
	padding: "0 12px 0 8px",
	listStyle: "none",
	selectors: {
		// 分類ごとに分かれた並びも、1つのカードの中で、続けて見えるよう、区切り線を引く。
		"& + &": { borderTop: "1px solid var(--color-border)" },
	},
});

// 条件つきのメモ 1 つ分のブロック。
export const branchBlock = style({
	boxSizing: "border-box",
	display: "grid",
	selectors: {
		"& + &": { borderTop: "1px solid var(--color-border)" },
		"&:has(+ ul)": { borderBottom: "1px solid var(--color-border)" },
	},
});

export const branchCondition = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	margin: 0,
	padding: "12px 16px",
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-semibold)",
	lineHeight: "var(--line-height-tight)",
});

export const branchConditionText = style({ flex: 1, minWidth: 0 });

export const branchSide = style({
	position: "relative",
	display: "grid",
	gap: 8,
	padding: "12px 12px 12px 20px",
	borderTop: "1px solid var(--color-border)",
	selectors: {
		"&::before": {
			content: '""',
			position: "absolute",
			left: 0,
			top: 12,
			bottom: 12,
			width: 4,
			borderRadius: "0 4px 4px 0",
			background: "var(--color-control-border)",
		},
		'&[data-side="then"]::before': { background: "var(--color-primary)" },
	},
});

export const branchSideTitle = style({
	display: "flex",
	margin: 0,
	fontSize: "var(--font-size-sm)",
});

export const branchSideRows = style({
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const branchSideEmpty = style({
	margin: 0,
	padding: "8px 0",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const branchSideActions = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
});

export const branchFooter = style({
	display: "grid",
	gap: 12,
	padding: "12px 16px",
	borderTop: "1px solid var(--color-border)",
});

export const branchDecide = style({
	display: "flex",
	gap: 8,
});

export const sheetFields = style({
	display: "grid",
	gap: 16,
});

export const sheetFooter = style({
	display: "flex",
	gap: 8,
	width: "100%",
});

export const sheetIntro = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

// 見出しの下のお知らせ（なければ、場所を取らない）。
export const notices = style({
	display: "grid",
	gap: 8,
	selectors: {
		"&:empty": { display: "none" },
	},
});

// 購入済みをまとめた、折りたたみのセクション。
export const purchasedSection = style({
	display: "grid",
	gap: 8,
});

export const purchasedHeader = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 8,
	padding: "0 4px",
});

export const purchasedToggle = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 6,
	minHeight: 44,
	padding: 0,
	color: "var(--color-text-muted)",
	font: "inherit",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
	background: "transparent",
	border: "none",
	cursor: "pointer",
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const purchasedChevron = style({
	display: "grid",
	transition: "transform var(--duration-fast) var(--ease-standard)",
	selectors: {
		'&[data-open="true"]': { transform: "rotate(90deg)" },
	},
});

export const purchasedCount = style({
	padding: "0 8px",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
	background: "var(--color-surface-muted)",
	borderRadius: 9999,
});

// まとめて追加（確認つき）。
export const bulkBody = style({
	display: "grid",
	gap: 16,
});

export const bulkList = style({
	margin: 0,
	padding: 0,
	overflow: "hidden",
	listStyle: "none",
	border: "1px solid var(--color-border)",
	borderRadius: "var(--radius-card)",
});

export const bulkRow = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 8,
	minHeight: 48,
	padding: "8px 16px",
	selectors: {
		"& + &": { borderTop: "1px solid var(--color-border)" },
	},
});

export const bulkName = style({
	flex: "1 1 auto",
	minWidth: 0,
	fontWeight: "var(--font-weight-semibold)",
	overflowWrap: "anywhere",
});

export const bulkQuantity = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const bulkError = style({
	margin: 0,
	color: "var(--color-error)",
});

// 入力の入口（まとめて追加・レシピから入れる）を、横に並べる。
export const entryRow = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
});

// 登録のない店を、店に追加する案内。
export const bulkNewStores = style({
	display: "grid",
	gap: 8,
	padding: 12,
	background: "var(--color-primary-soft)",
	borderRadius: "var(--radius-card)",
});

export const bulkNewStoresText = style({
	margin: 0,
	fontSize: "var(--font-size-sm)",
});

export const bulkNewStoreButtons = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
});

// 追加フォームの、右下の「追加 ＋」。
export const addSubmitRow = style({
	display: "flex",
	justifyContent: "flex-end",
});

// まとめて追加：PC は入力（左）と確認（右）、スマホは、タブで切り替える。
export const bulkColumns = style({
	display: "grid",
	gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
	gap: 24,
	alignItems: "start",
});

export const bulkPane = style({
	display: "grid",
	gap: 16,
	minWidth: 0,
});

export const bulkPaneTitle = style({
	margin: 0,
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
});

export const bulkEmpty = style({
	margin: 0,
	padding: 16,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	background: "var(--color-surface-muted)",
	borderRadius: "var(--radius-card)",
});
