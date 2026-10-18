import { type RecipeVariants, recipe } from "@vanilla-extract/recipes";

// 枠なし＝押せない（見るだけ）。
export const tag = recipe({
	base: {
		display: "inline-flex",
		alignItems: "center",
		gap: 4,
		height: 28,
		padding: "0 10px",
		borderRadius: 9999,
		background: "var(--color-surface-muted)",
		color: "var(--color-text)",
		fontSize: 14,
		fontWeight: 500,
		lineHeight: 1,
		whiteSpace: "nowrap",
	},
	variants: {
		tone: {
			default: {},
			warn: { background: "var(--color-warning-soft)" },
			error: { background: "var(--color-error-soft)", fontWeight: 600 },
			soft: { background: "var(--color-primary-soft)" },
			success: { background: "var(--color-success-soft)", fontWeight: 700 },
		},
		// 「約」（だいたい）の印：破線の輪郭。
		approximate: {
			true: {
				outline: "1.5px dashed var(--color-text-muted)",
				outlineOffset: -1.5,
			},
		},
	},
	defaultVariants: { tone: "default" },
});

// アイコンの色は、札の tone に合わせる。
export const icon = recipe({
	variants: {
		tone: {
			default: {},
			warn: { color: "var(--color-warning)" },
			error: { color: "var(--color-error)" },
			soft: {},
			success: { color: "var(--color-success)" },
		},
	},
	defaultVariants: { tone: "default" },
});

// props の型は、スタイルの定義から作る（種類を足すときは、ここだけを直す）。
export type TagTone = NonNullable<
	NonNullable<RecipeVariants<typeof tag>>["tone"]
>;
