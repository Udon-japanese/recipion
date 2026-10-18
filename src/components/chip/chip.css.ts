import { style } from "@vanilla-extract/css";
import { type RecipeVariants, recipe } from "@vanilla-extract/recipes";

// 枠あり＝押せる。見た目は 36px、押せる範囲は 44px。
// 選ばれているか（aria-pressed）や、押せないか（disabled）は、状態なので、属性のセレクタで書く。
export const chip = recipe({
	base: {
		position: "relative",
		display: "inline-flex",
		alignItems: "center",
		gap: 6,
		height: 36,
		padding: "0 16px",
		border: "1.5px solid var(--color-control-border)",
		borderRadius: 9999,
		background: "var(--color-surface)",
		color: "var(--color-text)",
		font: "inherit",
		fontSize: 14,
		fontWeight: 500,
		lineHeight: 1,
		whiteSpace: "nowrap",
		cursor: "pointer",
		WebkitTapHighlightColor: "transparent",
		transition: `background-color var(--duration-fast) var(--ease-standard)`,

		selectors: {
			"&::before": {
				content: '""',
				position: "absolute",
				left: 0,
				right: 0,
				top: -4,
				bottom: -4,
			},
			'&[aria-pressed="true"]': {
				background: "var(--color-primary-soft)",
				borderColor: "var(--color-text)",
				boxShadow: "0 0 0 1px var(--color-text)",
				fontWeight: 600,
			},
			"&:hover:not(:disabled)": { background: "var(--color-surface-muted)" },
			'&[aria-pressed="true"]:hover:not(:disabled)': {
				background: "var(--color-primary-soft-hover)",
			},
			"&:active:not(:disabled)": { transform: "scale(0.97)" },
			"&:focus-visible": {
				outline: "3px solid var(--color-focus)",
				outlineOffset: 2,
			},
			"&:disabled": {
				color: "var(--color-text-disabled)",
				borderColor: "var(--color-border)",
				cursor: "not-allowed",
			},
		},
	},
	variants: {
		size: {
			md: {},
			// 数量の押しボタン：大きな数字。
			qty: {
				height: 44,
				fontSize: 22,
				fontWeight: 700,
				padding: "0 16px",
				selectors: {
					"&::before": { display: "none" },
					// 選ばれているときも、太さは 700（選択の太さ 600 より、数量の太さを優先する）。
					'&[aria-pressed="true"]': { fontWeight: 700 },
				},
			},
		},
	},
	defaultVariants: { size: "md" },
});

// props の型は、スタイルの定義から作る（種類を足すときは、ここだけを直す）。
export type ChipSize = NonNullable<
	NonNullable<RecipeVariants<typeof chip>>["size"]
>;

export const unit = style({ fontSize: 16, fontWeight: 500 });

export const group = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
	margin: 0,
	padding: 0,
	border: 0,
	minWidth: 0,
});
