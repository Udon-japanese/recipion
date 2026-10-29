import { style } from "@vanilla-extract/css";
import { type RecipeVariants, recipe } from "@vanilla-extract/recipes";

// 見た目は 36px の丸。押せる範囲は、44px 以上（::before で広げる）。
// 押せないか（disabled）や、押している最中（:active）は、状態なので、セレクタで書く。
export const button = recipe({
	base: {
		position: "relative",
		display: "grid",
		placeItems: "center",
		flex: "none",
		width: 36,
		height: 36,
		padding: 0,
		border: 0,
		borderRadius: "50%",
		background: "var(--color-surface-muted)",
		color: "var(--color-text)",
		cursor: "pointer",
		WebkitTapHighlightColor: "transparent",
		WebkitTouchCallout: "none",
		transition: `background-color var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)`,

		selectors: {
			"&::before": { content: '""', position: "absolute", inset: -4 },
			"&:hover:not(:disabled):not([aria-disabled='true'])": {
				background: "var(--color-border)",
			},
			"&:active:not(:disabled)": { transform: "scale(0.94)" },
			"&:focus-visible": {
				outline: "3px solid var(--color-focus)",
				outlineOffset: 2,
			},
			"&:disabled": {
				color: "var(--color-text-disabled)",
				cursor: "not-allowed",
			},
		},
	},
	variants: {
		// sm（既定）：見た目は 36px、押せる範囲は 44px。std：見た目も 44px。
		size: {
			sm: {},
			std: {
				width: 44,
				height: 44,
				selectors: { "&::before": { inset: 0 } },
			},
		},
		// muted（既定）：薄い灰色の丸／plain：背景なし／danger：赤い文字／on：選択中（黄色の丸＋濃い枠）。
		tone: {
			muted: {},
			plain: {
				background: "transparent",
				selectors: {
					'&:hover:not(:disabled):not([aria-disabled="true"])': {
						background: "var(--color-surface-muted)",
					},
				},
			},
			danger: { color: "var(--color-error)" },
			// 選んだものへの操作など、目立たせたいとき。
			accent: {
				background: "var(--color-primary-soft)",
				color: "var(--color-accent-text)",
			},
			on: {
				background: "var(--color-primary)",
				border: "2px solid var(--color-text)",
				color: "var(--color-on-primary)",
			},
		},
		// 並べ替えのつかみ：指で触れたとき、ブラウザのスクロールに奪われない。
		dragHandle: {
			true: {
				touchAction: "none",
				cursor: "grab",
				userSelect: "none",
				WebkitUserSelect: "none",
				WebkitTouchCallout: "none",
			},
		},
	},
	defaultVariants: { size: "sm", tone: "muted" },
});

type Variants = NonNullable<RecipeVariants<typeof button>>;

// props の型は、スタイルの定義から作る（種類を足すときは、ここだけを直す）。
export type IconButtonSize = NonNullable<Variants["size"]>;
export type IconButtonTone = NonNullable<Variants["tone"]>;

// 長押し（マウスは、少し置いたとき）に出る、ボタンの名前の吹き出し。飾りで、読み上げない（名前は aria-label が持つ）。
export const tip = style({
	position: "fixed",
	zIndex: 2000,
	padding: "4px 8px",
	borderRadius: 6,
	background: "var(--color-text)",
	color: "var(--color-surface)",
	fontSize: "var(--font-size-xs)",
	lineHeight: 1.3,
	whiteSpace: "nowrap",
	pointerEvents: "none",
	boxShadow: "var(--shadow-md)",
});
