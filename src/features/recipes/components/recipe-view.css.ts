import { style } from "@vanilla-extract/css";

// 幅が足りるとき（この部品の幅で決める。プレビューの中でも崩れない）、材料と作り方を左右に並べる。
const splitWidth = "(min-width: 720px)";

export const container = style({
	display: "grid",
	gap: 16,
	containerType: "inline-size",
	width: "min(100% - 32px, 960px)",
	marginInline: "auto",
	paddingBlock: 24,
	color: "var(--color-text)",
	lineHeight: "var(--line-height-relaxed)",
});

export const header = style({ display: "grid", gap: 8 });

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-2xl)",
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: "var(--line-height-tight)",
	overflowWrap: "anywhere",
});

export const tabs = style({
	maxWidth: 640,
	"@container": { [splitWidth]: { display: "none" } },
});

export const panes = style({
	display: "grid",
	gap: 16,

	selectors: {
		'&[data-single="true"]': { maxWidth: 640 },
	},
	"@container": {
		[splitWidth]: {
			gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
			alignItems: "start",
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

export const tags = style({ display: "flex", flexWrap: "wrap", gap: 8 });

export const section = style({
	display: "grid",
	gap: 8,
});

export const sectionHeader = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 12,
});

export const sectionTitle = style({
	margin: 0,
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-bold)",
});

export const list = style({
	display: "grid",
	gap: 6,
	margin: 0,
	paddingLeft: 24,
	listStyle: "revert",
	whiteSpace: "pre-wrap",
});

export const ingredientBlocks = style({ display: "grid", gap: 12 });

const groupTones = [
	{ background: "#fff3c4", accent: "#e9a900" },
	{ background: "#eaf5ee", accent: "#2f7d4a" },
	{ background: "#e8f0fa", accent: "#3b78b8" },
	{ background: "#f1ecfa", accent: "#7a5cb5" },
	{ background: "#fbeaf0", accent: "#c44a7a" },
];

// グループの囲み。色は data-tone（0〜4）で変える。
export const groupBox = style({
	display: "grid",
	gap: 8,
	padding: "12px 16px",
	boxSizing: "border-box",
	borderLeft: "4px solid",
	borderRadius: 12,

	selectors: Object.fromEntries(
		groupTones.map(({ background, accent }, index) => [
			`&[data-tone="${index}"]`,
			{ background, borderLeftColor: accent },
		]),
	),
});

export const groupTitle = style({
	margin: 0,
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-bold)",
});

export const ingredientRow = style({
	display: "flex",
	justifyContent: "space-between",
	gap: 16,
});

export const sourceUrl = style({
	overflowWrap: "anywhere",
});

export const note = style({
	margin: 0,
	whiteSpace: "pre-wrap",
});

// 本文の中の、他のレシピへのリンク（押すと、プレビュー）。
export const linkButton = style({
	padding: 0,
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

export const linkedRecipe = style({
	display: "grid",
	gap: 4,
	marginTop: 4,
	paddingLeft: 12,
	borderLeft: "2px solid var(--color-border-strong)",
});

export const linkedToggle = style({
	justifySelf: "start",
	padding: 0,
	color: "var(--color-text-muted)",
	background: "none",
	border: 0,
	font: "inherit",
	fontSize: 13,
	cursor: "pointer",
});

export const linkedNote = style({
	margin: "4px 0 0",
	color: "var(--color-text-muted)",
	fontSize: 13,
});
