import { keyframes, style } from "@vanilla-extract/css";
import { type RecipeVariants, recipe } from "@vanilla-extract/recipes";

const spin = keyframes({ to: { transform: "rotate(360deg)" } });

export const note = recipe({
	base: {
		display: "flex",
		alignItems: "center",
		gap: 12,
		minHeight: 52,
		padding: "8px 8px 8px 16px",
		borderRadius: 16,
		background: "var(--color-surface-muted)",
		fontSize: "var(--font-size-sm)",
		lineHeight: 1.45,
	},
	variants: {
		tone: {
			neutral: {},
			info: { background: "var(--color-primary-soft)" },
			warn: { background: "var(--color-warning-soft)" },
			success: { background: "var(--color-success-soft)" },
			error: { background: "var(--color-error-soft)" },
		},
	},
	defaultVariants: { tone: "neutral" },
});

// アイコンの色は、お知らせの tone に合わせる。回す（spinning）かどうかは、状態なので data 属性のまま。
export const icon = recipe({
	base: {
		flex: "none",
		display: "inline-flex",
		selectors: {
			'&[data-spinning="true"]': { animation: `${spin} 1s linear infinite` },
		},
		"@media": {
			"(prefers-reduced-motion: reduce)": {
				selectors: { '&[data-spinning="true"]': { animation: "none" } },
			},
		},
	},
	variants: {
		tone: {
			neutral: {},
			info: {},
			warn: { color: "var(--color-warning)" },
			success: { color: "var(--color-success)" },
			error: { color: "var(--color-error)" },
		},
	},
	defaultVariants: { tone: "neutral" },
});

export const text = style({ flex: 1, minWidth: 0 });

// props の型は、スタイルの定義から作る（種類を足すときは、ここだけを直す）。
export type NoteTone = NonNullable<
	NonNullable<RecipeVariants<typeof note>>["tone"]
>;
