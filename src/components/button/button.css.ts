import { createVar, keyframes, style } from "@vanilla-extract/css";
import { type RecipeVariants, recipe } from "@vanilla-extract/recipes";

// 完了＝緑、失敗＝赤。形の変化は同じで、色だけを切り替える。
const tone = createVar();
const toneSoft = createVar();

// ホバー・押下の見た目は、押せるときだけ（無効・処理中は除く）。
const canHover = ':hover:not(:disabled):not([aria-disabled="true"])';
const canPress = ':active:not(:disabled):not([aria-disabled="true"])';

const ease = "var(--ease-standard)";
const emphasized = "var(--ease-emphasized)";

// 幅を固定して、周りの並びがずれないようにする（変形のあいだ）。
export const wrapper = recipe({
	base: {
		display: "inline-flex",
		alignItems: "center",
		justifyContent: "center",
		minWidth: "var(--box-width, 0)",
		minHeight: "var(--box-height, 0)",
		verticalAlign: "middle",
		position: "relative",
	},
	variants: {
		fullWidth: { true: { display: "flex", width: "100%" } },
		// 並びの中での位置（フォームの右端に置くときは end）。
		align: { start: {}, end: { justifySelf: "end" } },
	},
	defaultVariants: { align: "start" },
});

// 見た目の種類・大きさ・幅は、recipe の variants（型で守る）。
// 実行中に変わる状態（処理中・完了・失敗・使えない）は、data 属性のセレクタで書く。
export const button = recipe({
	base: {
		position: "relative",
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
		// 中のラベルより小さく縮めるため（変形のとき）。
		minWidth: 0,
		boxSizing: "border-box",
		minHeight: 48,
		paddingInline: 24,
		border: "1.5px solid transparent",
		borderRadius: "var(--radius-control)",
		font: "inherit",
		fontSize: "var(--font-size-sm)",
		fontWeight: "var(--font-weight-bold)",
		lineHeight: 1,
		whiteSpace: "nowrap",
		textDecoration: "none",
		cursor: "pointer",
		overflow: "hidden",
		WebkitTapHighlightColor: "transparent",
		transition: [
			`width 420ms ${emphasized}`,
			`background-color var(--duration-normal) ${ease}`,
			`border-color var(--duration-normal) ${ease}`,
			`box-shadow var(--duration-normal) ${ease}`,
			`transform var(--duration-fast) ${ease}`,
		].join(", "),

		vars: {
			[tone]: "var(--color-success)",
			[toneSoft]: "var(--color-success-soft)",
		},

		selectors: {
			'&[data-tone="error"]': {
				vars: {
					[tone]: "var(--color-error)",
					[toneSoft]: "var(--color-error-soft)",
				},
			},
			"&:focus-visible": {
				outline: "3px solid var(--color-focus)",
				outlineOffset: 3,
			},
			[`&${canPress}`]: { transform: "translateY(1px) scale(0.98)" },

			// ---- 使えない（入力が足りないなど） ----
			'&[data-disabled="true"]': {
				color: "var(--color-text-disabled)",
				background: "var(--color-surface-muted)",
				borderColor: "var(--color-border)",
				boxShadow: "none",
				cursor: "not-allowed",
				transform: "none",
			},

			// ---- 処理中・完了・失敗（どの種類でも同じ形） ----
			// 変形中は、横の余白をなくす（余白が丸の幅より大きいと、正円にならない）。
			'&:not([data-phase="idle"])': { paddingInline: 0 },
			'&[data-phase="loading"]': {
				background: "var(--color-surface)",
				borderColor: "var(--color-border-strong)",
				boxShadow: "var(--shadow-sm)",
				pointerEvents: "none",
			},
			'&[data-phase="success"], &[data-phase="error"]': {
				background: "transparent",
				borderColor: "transparent",
				boxShadow: "none",
				overflow: "visible",
			},
			'&[data-phase="success-expanded"], &[data-phase="error-expanded"]': {
				background: toneSoft,
				borderColor: toneSoft,
				boxShadow: "var(--shadow-md)",
				overflow: "hidden",
			},
			// 完了・失敗の表示中も押せる。ホバーや押下で、色は変えない。
			[`&[data-phase="success"]${canHover}, &[data-phase="success"]${canPress}, &[data-phase="error"]${canHover}, &[data-phase="error"]${canPress}`]:
				{
					background: "transparent",
					borderColor: "transparent",
				},
			[`&[data-phase="success-expanded"]${canHover}, &[data-phase="success-expanded"]${canPress}, &[data-phase="error-expanded"]${canHover}, &[data-phase="error-expanded"]${canPress}`]:
				{
					background: toneSoft,
					borderColor: toneSoft,
				},
		},
	},
	variants: {
		variant: {
			primary: {
				color: "var(--color-on-primary)",
				background: "var(--color-primary)",
				borderColor: "var(--color-primary)",
				boxShadow: "var(--shadow-md)",
				selectors: {
					[`&${canHover}`]: {
						background: "var(--color-primary-hover)",
						borderColor: "var(--color-primary-hover)",
					},
					[`&${canPress}`]: {
						background: "var(--color-primary-pressed)",
						borderColor: "var(--color-primary-pressed)",
					},
				},
			},
			secondary: {
				color: "var(--color-text)",
				background: "var(--color-surface)",
				borderColor: "var(--color-control-border)",
				selectors: {
					[`&${canHover}`]: { background: "var(--color-surface-muted)" },
				},
			},
			danger: {
				color: "var(--color-on-error)",
				background: "var(--color-error)",
				borderColor: "var(--color-error)",
				boxShadow: "var(--shadow-sm)",
				selectors: {
					[`&${canHover}`]: {
						background: "color-mix(in srgb, var(--color-error) 88%, black)",
						borderColor: "color-mix(in srgb, var(--color-error) 88%, black)",
					},
				},
			},
			ghost: {
				color: "var(--color-text)",
				background: "transparent",
				fontWeight: "var(--font-weight-semibold)",
				// 文字だけでも、押せると分かるように、細い下線を付ける（暫定。デザインの案で決める）。
				textDecoration: "underline",
				textDecorationColor: "var(--color-border-strong)",
				textUnderlineOffset: 4,
				selectors: {
					[`&${canHover}`]: { background: "var(--color-surface-muted)" },
				},
			},
		},
		size: {
			sm: { minHeight: 40, paddingInline: 16 },
			md: {},
			lg: {
				minHeight: 52,
				paddingInline: 24,
				fontSize: "var(--font-size-md)",
			},
		},
		// 幅いっぱいのボタン（変形のあいだは、固定した幅が、インラインの指定で優先される）。
		fullWidth: { true: { width: "100%" } },
	},
	defaultVariants: { variant: "primary", size: "md" },
});

// props の型は、スタイルの定義から作る（種類を足すときは、ここだけを直す）。
type ButtonStyleVariants = NonNullable<RecipeVariants<typeof button>>;
export type ButtonVariant = NonNullable<ButtonStyleVariants["variant"]>;
export type ButtonSize = NonNullable<ButtonStyleVariants["size"]>;

const inPhase = (phases: string[]) =>
	phases
		.map((p) => `.${button.classNames.base}[data-phase="${p}"] &`)
		.join(", ");

const resultPhases = ["success", "error", "success-expanded", "error-expanded"];

export const label = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 8,
	transition: `opacity 180ms ${ease}, transform 260ms ${emphasized}`,

	selectors: {
		[inPhase(["loading", ...resultPhases])]: {
			opacity: 0,
			transform: "scale(0.45)",
		},
	},
});

// マスコットの層。処理中だけ見える。
export const mascotLayer = style({
	position: "absolute",
	inset: 0,
	display: "grid",
	placeItems: "center",
	opacity: 0,
	transform: "scale(0.65)",
	pointerEvents: "none",
	transition: `opacity 140ms ${ease} 120ms, transform 300ms ${emphasized} 120ms`,

	selectors: {
		[inPhase(["loading"])]: { opacity: 1, transform: "scale(1)" },
	},
});

// 完了・失敗の層（丸＋マーク、広がると文言）。
export const result = style({
	position: "absolute",
	inset: 0,
	opacity: 0,
	pointerEvents: "none",
	transition: `opacity 120ms ${ease}`,

	selectors: {
		[inPhase(resultPhases)]: { opacity: 1 },
	},
});

export const resultCircle = style({
	position: "absolute",
	left: "calc(var(--box-height, 52px) / 2)",
	top: "50%",
	display: "grid",
	placeItems: "center",
	width: "calc(var(--box-height, 52px) - 4px)",
	height: "calc(var(--box-height, 52px) - 4px)",
	borderRadius: "50%",
	background: tone,
	opacity: 0,
	transform: "translate(-50%, -50%) scale(0.55)",
	transition: `transform 300ms ${emphasized}, opacity 160ms ${ease}`,

	selectors: {
		[inPhase(resultPhases)]: {
			opacity: 1,
			transform: "translate(-50%, -50%) scale(1)",
		},
	},
});

export const icon = style({
	width: 24,
	height: 24,
	fill: "none",
	stroke: "var(--color-surface)",
	strokeWidth: 3.2,
	strokeLinecap: "round",
	strokeLinejoin: "round",
	overflow: "visible",
	opacity: 0,
	transform: "scale(0.35)",
	transition: `transform 280ms ${emphasized}, opacity 120ms ${ease}`,

	selectors: {
		[inPhase(resultPhases)]: { opacity: 1, transform: "scale(1)" },
	},
});

export const resultText = style({
	position: "absolute",
	left: "var(--box-height, 52px)",
	right: 0,
	top: "50%",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	height: 24,
	lineHeight: "24px",
	whiteSpace: "nowrap",
	overflow: "hidden",
	color: tone,
	fontWeight: "var(--font-weight-bold)",
	opacity: 0,
	transform: "translateY(-50%) translateX(-10px)",
	transition: `opacity 220ms ${ease} 180ms, transform 360ms ${emphasized} 180ms`,

	selectors: {
		[inPhase(["success-expanded", "error-expanded"])]: {
			opacity: 1,
			transform: "translateY(-50%) translateX(0)",
		},
	},
});

// 見えないが、読み上げられる。
export const srOnly = style({
	position: "absolute",
	width: 1,
	height: 1,
	margin: -1,
	padding: 0,
	overflow: "hidden",
	clip: "rect(0 0 0 0)",
	whiteSpace: "nowrap",
	border: 0,
});

export const leadingIcon = style({
	display: "inline-flex",
	flexShrink: 0,
});

const reasonIn = keyframes({
	from: { opacity: 0, transform: "translate(-50%, 4px)" },
	to: { opacity: 1, transform: "translate(-50%, 0)" },
});

// 無効のボタンを押したときだけ出る、短い理由。
export const reason = style({
	position: "absolute",
	left: "50%",
	bottom: "calc(100% + 8px)",
	zIndex: 30,
	width: "max-content",
	maxWidth: "min(280px, 90vw)",
	padding: "6px 12px",
	borderRadius: 12,
	color: "var(--color-surface)",
	background: "var(--color-text)",
	boxShadow: "var(--shadow-md)",
	fontSize: "var(--font-size-xs)",
	lineHeight: 1.45,
	textAlign: "center",
	pointerEvents: "none",
	animation: `${reasonIn} var(--duration-normal) var(--ease-emphasized) both`,
});
