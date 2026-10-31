import { style } from "@vanilla-extract/css";

const PC = "(min-width: 768px)";

export const page = style({
	display: "grid",
	alignContent: "start",
	gap: 16,
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
	flex: "1 1 auto",
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
		// PC：見出しと右上のボタンの下の段に、1行で置く。
		[PC]: { flex: "1 1 100%", maxWidth: 320 },
	},
});

// PC：右上の、追加まわりのボタン。
export const headActions = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
});

// 「ほかの入れ方」（短い文字＋アイコンのボタン。白地に枠）。
export const headMenuButton = style({
	boxSizing: "border-box",
	display: "inline-flex",
	alignItems: "center",
	gap: 8,
	minHeight: 44,
	padding: "0 18px",
	color: "var(--color-text)",
	font: "inherit",
	fontWeight: "var(--font-weight-bold)",
	background: "var(--color-surface)",
	border: "1.5px solid var(--color-control-border)",
	borderRadius: 9999,
	cursor: "pointer",
	selectors: {
		"&:hover:not(:disabled)": { background: "var(--color-surface-muted)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
		"&:disabled": { color: "var(--color-text-disabled)", cursor: "default" },
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

// 購入確定のバー（チェックが入っているときだけ出る）。スマホは、下のナビの上に、いつも貼り付く（内容の量に関係なく）。
// PC は、画面の下に貼り付く。
export const purchaseBar = style({
	position: "fixed",
	left: 0,
	right: 0,
	bottom: "calc(64px + env(safe-area-inset-bottom))",
	zIndex: 5,
	padding: "12px 16px",
	// 買ったものを確定できることを、色でも伝える。
	background: "var(--color-primary-soft)",
	borderTop: "1px solid var(--color-border)",
	boxShadow: "var(--shadow-sheet)",
	"@media": {
		[PC]: {
			position: "sticky",
			left: "auto",
			right: "auto",
			bottom: 16,
			marginTop: 8,
			borderTop: 0,
			borderRadius: "var(--radius-card)",
			boxShadow: "var(--shadow-md)",
		},
	},
});

// 買うものを入れる「＋」と、その真上の「ほかの入れ方」。いつも画面の隅にある。購入確定のバーが出ているときは、その上。
export const fabGroup = style({
	position: "fixed",
	right: 16,
	bottom: "calc(64px + env(safe-area-inset-bottom) + 16px)",
	zIndex: 6,
	display: "grid",
	justifyItems: "center",
	gap: 12,
	transition: "bottom var(--duration-normal) var(--ease-standard)",
	selectors: {
		'&[data-lifted="true"]': {
			bottom: "calc(64px + env(safe-area-inset-bottom) + 16px + 76px)",
		},
	},
});

// 「＋」の上の、小さな丸（白い地と影で、後ろの内容から浮かせる）。
export const fabSub = style({
	display: "grid",
	background: "var(--color-surface)",
	borderRadius: "50%",
	boxShadow: "var(--shadow-md)",
});

export const fab = style({
	display: "grid",
	placeItems: "center",
	width: 56,
	height: 56,
	padding: 0,
	border: 0,
	borderRadius: "50%",
	background: "var(--color-primary)",
	color: "var(--color-on-primary)",
	boxShadow: "0 6px 20px rgba(233, 169, 0, 0.45)",
	cursor: "pointer",
	WebkitTapHighlightColor: "transparent",
	selectors: {
		"&:hover": { background: "var(--color-primary-hover)" },
		"&:active": { transform: "scale(0.94)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-text)",
			outlineOffset: 3,
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

// 条件つきのメモのカードを、分類のカードの中に置く余白。
export const branchSlot = style({ padding: 8 });

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

// 購入済みの一覧は、白いカードではなく、薄いベージュ（済んだもの）。
export const purchasedList = style({
	margin: 0,
	padding: "0 12px 0 8px",
	listStyle: "none",
	background: "var(--color-surface-muted)",
	borderRadius: "var(--radius-card)",
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
