import { style } from "@vanilla-extract/css";

// 幅が足りるとき（この部品の幅で決める。プレビューの中でも崩れない）、材料と作り方を左右に並べる。
const splitWidth = "(min-width: 720px)";

export const container = style({
	display: "grid",
	gap: 16,
	containerType: "inline-size",
	width: "100%",
	color: "var(--color-text)",
	lineHeight: "var(--line-height-relaxed)",
});

// 料理の絵（左）・題名と印（中）・操作（右）。
export const header = style({
	display: "grid",
	gridTemplateColumns: "auto minmax(0, 1fr) auto",
	alignItems: "center",
	columnGap: 16,
	rowGap: 12,
	selectors: {
		'&[data-compact="true"]': { columnGap: 12 },
	},
});

// 料理の絵の枠（絵は飾り）。
export const cover = style({
	display: "grid",
	alignSelf: "start",
	overflow: "hidden",
	borderRadius: 16,
	background: "var(--color-primary-soft)",
});

export const heading = style({
	display: "grid",
	gap: 6,
	minWidth: 0,
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-2xl)",
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: "var(--line-height-tight)",
	overflowWrap: "anywhere",
});

export const meta = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 8,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-tight)",
});

export const servings = style({
	fontWeight: "var(--font-weight-semibold)",
});

export const actions = style({
	display: "flex",
	alignItems: "center",
	alignSelf: "start",
	gap: 4,
});

export const headerExtra = style({
	gridColumn: "1 / -1",
	minWidth: 0,
});

export const tabs = style({
	"@container": { [splitWidth]: { display: "none" } },
});

export const panes = style({
	display: "grid",
	gap: 16,

	"@container": {
		[splitWidth]: {
			gridTemplateColumns: "minmax(0, 5fr) minmax(0, 6fr)",
			alignItems: "start",
			selectors: {
				'&[data-single="true"]': { gridTemplateColumns: "minmax(0, 1fr)" },
			},
		},
	},
});

export const pane = style({
	display: "grid",
	gap: 16,
	minWidth: 0,

	selectors: {
		'&[data-active="false"]': { display: "none" },
	},
	"@container": {
		[splitWidth]: {
			selectors: { '&[data-active="false"]': { display: "grid" } },
		},
	},
});

export const section = style({
	display: "grid",
	gap: 8,
});

export const sectionHeader = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 12,
	minHeight: 32,
});

export const sectionFooter = style({
	marginTop: 8,
	paddingTop: 16,
	borderTop: "1px solid var(--color-border)",
});

export const sectionTitle = style({
	margin: 0,
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-bold)",
});

export const ingredientBlocks = style({ display: "grid", gap: 8 });

// 材料の行：名前（左）と分量（右）。行のあいだに、細い線。
export const ingredientList = style({
	display: "grid",
	margin: 0,
	padding: 0,
	listStyle: "none",
});

export const ingredientItem = style({
	selectors: {
		"& + &": { borderTop: "1px solid var(--color-border)" },
	},
});

export const ingredientRow = style({
	display: "flex",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: 16,
	paddingBlock: 8,
});

export const ingredientName = style({
	minWidth: 0,
	overflowWrap: "anywhere",
});

export const amount = style({
	flex: "none",
	maxWidth: "50%",
	color: "var(--color-text-muted)",
	fontVariantNumeric: "tabular-nums",
	textAlign: "right",
	overflowWrap: "anywhere",
});

const groupTones = ["#fff3c4", "#eaf5ee", "#e8f0fa", "#f1ecfa", "#fbeaf0"];

// グループの囲み。色は data-tone（0〜4）で変える。
export const groupBox = style({
	display: "grid",
	gap: 2,
	padding: "10px 14px 4px",
	boxSizing: "border-box",
	borderRadius: 12,

	selectors: Object.fromEntries(
		groupTones.map((background, index) => [
			`&[data-tone="${index}"]`,
			{ background },
		]),
	),
});

export const groupTitle = style({
	margin: 0,
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-bold)",
});

// リンク先の箱（上の段のリンク1つにつき1つ）。中の深いリンクは、箱を重ねず、字下げで表す。
export const linkedBox = style({
	boxSizing: "border-box",
	marginBlock: 4,
	padding: "4px 4px 6px 14px",
	borderRadius: 12,
	background: "var(--color-surface-muted)",
});

// 名前の行：開閉のボタン（名前・分量・開閉の印）と、プレビューを開くボタン。
export const linkedHeader = style({
	display: "flex",
	alignItems: "center",
	gap: 2,
});

export const linkedToggle = style({
	boxSizing: "border-box",
	display: "flex",
	flex: 1,
	alignItems: "center",
	gap: 12,
	minWidth: 0,
	minHeight: 44,
	padding: 0,
	color: "var(--color-text)",
	font: "inherit",
	textAlign: "start",
	background: "none",
	border: 0,
	borderRadius: 8,
	cursor: "pointer",
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
	},
});

export const linkedName = style({
	flex: 1,
	minWidth: 0,
	color: "var(--color-accent-text)",
	fontWeight: "var(--font-weight-semibold)",
	overflowWrap: "anywhere",
	selectors: {
		[`${linkedToggle}:hover &`]: { textDecoration: "underline" },
	},
});

export const chevron = style({
	display: "grid",
	flex: "none",
	color: "var(--color-text-muted)",
	transition: "transform var(--duration-fast) var(--ease-standard)",
	selectors: {
		'&[data-open="true"]': { transform: "rotate(180deg)" },
	},
	"@media": {
		"(prefers-reduced-motion: reduce)": { transition: "none" },
	},
});

// 開いた中身。箱の中の深い段は、字下げする。
export const linkedChildren = style({
	paddingRight: 10,
	paddingBottom: 4,
	selectors: {
		'&[data-indent="true"]': { paddingLeft: 16 },
	},
});

// 箱の中のグループ（色の枠にせず、見出しだけ）。
export const nestedGroup = style({
	display: "grid",
	gap: 2,
	paddingTop: 6,
});

export const linkedNote = style({
	marginLeft: 8,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

// 下準備：点つきの箇条書き。
export const bulletList = style({
	display: "grid",
	gap: 6,
	margin: 0,
	paddingLeft: 20,
	whiteSpace: "pre-wrap",
});

export const bulletItem = style({
	listStyle: "disc",
	selectors: {
		"&::marker": { color: "var(--color-text-muted)" },
	},
});

// 作り方：丸で囲んだ番号＋文。
export const steps = style({
	display: "grid",
	gap: 12,
	margin: 0,
	padding: 0,
	listStyle: "none",
	counterReset: "step",
});

export const step = style({
	display: "grid",
	gridTemplateColumns: "28px minmax(0, 1fr)",
	alignItems: "start",
	gap: 12,
	counterIncrement: "step",
	selectors: {
		"&::before": {
			content: "counter(step)",
			display: "grid",
			placeItems: "center",
			width: 28,
			height: 28,
			marginTop: 1,
			color: "var(--color-text)",
			fontSize: "var(--font-size-sm)",
			fontWeight: "var(--font-weight-bold)",
			lineHeight: 1,
			background: "var(--color-primary-soft)",
			borderRadius: "50%",
		},
	},
});

export const stepText = style({
	whiteSpace: "pre-wrap",
	overflowWrap: "anywhere",
});

export const sourceUrl = style({
	margin: 0,
	overflowWrap: "anywhere",
});

export const note = style({
	margin: 0,
	whiteSpace: "pre-wrap",
});

export const empty = style({
	margin: 0,
	color: "var(--color-text-muted)",
});

// 本文の中の、他のレシピへのリンク（押すと、プレビュー）。
export const linkButton = style({
	padding: 0,
	// 折り返したとき、ボタンの既定の中央寄せにしない。
	textAlign: "start",
	color: "var(--color-accent-text)",
	background: "none",
	border: "none",
	font: "inherit",
	textDecoration: "underline",
	cursor: "pointer",
});

// リンク先が見つからないとき。
export const missingLink = style({
	color: "var(--color-text-muted)",
});
