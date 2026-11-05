import { style } from "@vanilla-extract/css";
import { type RecipeVariants, recipe } from "@vanilla-extract/recipes";

export const popup = style({
	position: "fixed",
	zIndex: 30,
	boxSizing: "border-box",
	minWidth: 216,
	width: "fit-content",
	display: "flex",
	flexDirection: "column",
	padding: 4,
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 16,
	boxShadow: "var(--shadow-md)",
});

export const item = recipe({
	base: {
		display: "flex",
		alignItems: "center",
		gap: 12,
		height: 48,
		padding: "0 16px",
		border: 0,
		borderRadius: 12,
		background: "transparent",
		color: "var(--color-text)",
		font: "inherit",
		fontSize: 16,
		fontWeight: "var(--font-weight-medium)",
		textAlign: "left",
		cursor: "pointer",

		selectors: {
			"&:hover:not([aria-disabled='true'])": {
				background: "var(--color-surface-muted)",
			},
			"&:focus-visible": {
				outline: "3px solid var(--color-focus)",
				outlineOffset: -3,
			},
			// 押せないときは、danger の色より優先する。
			"&[aria-disabled='true']": {
				color: "var(--color-text-disabled)",
				cursor: "not-allowed",
			},
		},
	},
	variants: {
		tone: {
			default: {},
			danger: {
				color: "var(--color-error)",
				fontWeight: "var(--font-weight-semibold)",
			},
		},
	},
	defaultVariants: { tone: "default" },
});

// 下の階層へ進む項目の、名前（伸びる）と、いまの値（右に薄く）。
export const itemLabel = style({ flex: 1 });

export const itemDetail = style({
	color: "var(--color-text-muted)",
	fontSize: 14,
	fontWeight: "var(--font-weight-regular)",
});

// 選択肢のチェックの印の場所（印がない行も、文字の位置をそろえる）。
export const checkSlot = style({
	display: "inline-flex",
	width: 20,
	flex: "none",
});

// 下の階層の見出し（戻る・見出しの文字）。
export const submenuHeader = style({
	display: "flex",
	alignItems: "center",
	gap: 4,
	padding: "0 12px 4px 0",
	marginBottom: 4,
	borderBottom: "1px solid var(--color-border)",
});

export const submenuTitle = style({
	color: "var(--color-text-muted)",
	fontSize: 14,
	fontWeight: "var(--font-weight-semibold)",
});

// props の型は、スタイルの定義から作る（種類を足すときは、ここだけを直す）。
export type MenuItemTone = NonNullable<
	NonNullable<RecipeVariants<typeof item>>["tone"]
>;
