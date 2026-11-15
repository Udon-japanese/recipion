import { createVar, fallbackVar, style } from "@vanilla-extract/css";

// 行の左右の余白の足し分。カード側に余白を持たせず、行の中に持たせると、チェック済みの塗りがカードの端まで届く。
// 区切り線は、この足し分だけ内側から引く（カードの端には届かせない）。
export const rowInsetStart = createVar();
export const rowInsetEnd = createVar();
const insetStart = fallbackVar(rowInsetStart, "0px");
const insetEnd = fallbackVar(rowInsetEnd, "0px");

export const row = style({
	position: "relative",
	display: "flex",
	alignItems: "center",
	gap: 15,
	minHeight: 64,
	paddingBlock: 12,
	paddingInlineStart: `calc(12px + ${insetStart})`,
	paddingInlineEnd: `calc(12px + ${insetEnd})`,
	listStyle: "none",

	selectors: {
		// 上の区切り線。
		"&::before": {
			content: "",
			position: "absolute",
			insetBlockStart: 0,
			insetInlineStart: insetStart,
			insetInlineEnd: insetEnd,
			borderTop: "1px solid var(--color-border)",
		},
		"&:first-child::before": { content: "none" },
		// チェックを入れた（買った）行は、薄い緑（色で、済んだことが分かる）。
		// 塗りは行の端から端まで（角は、カードの角丸で切り取る）。塗りの上下には、区切り線を引かない。
		"&[data-checked]": { background: "var(--color-success-soft)" },
		"&[data-checked]::before": { content: "none" },
		"[data-checked] + &::before": { content: "none" },
		// 持ち上げて動かしているとき。
		"&[data-dragging]": {
			background: "var(--color-surface)",
			border: "2px solid var(--color-text)",
			borderRadius: 16,
			boxShadow: "var(--shadow-md)",
		},
		"&[data-dragging]::before": { content: "none" },
	},
});

export const main = style({
	display: "flex",
	flexDirection: "column",
	flex: 1,
	minWidth: 0,
	gap: 4,
});

export const actions = style({
	display: "flex",
	flex: "none",
	alignItems: "center",
	gap: 0,
});

export const name = style({
	fontSize: 16,
	fontWeight: "var(--font-weight-semibold)",
	lineHeight: 1.35,
	overflowWrap: "anywhere",
});

export const nameDone = style([
	name,
	{
		fontWeight: "var(--font-weight-medium)",
		color: "var(--color-text-muted)",
		textDecoration: "line-through",
		textDecorationThickness: "1.5px",
	},
]);

export const meta = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 6,
	fontSize: 14,
	color: "var(--color-text-muted)",
});
