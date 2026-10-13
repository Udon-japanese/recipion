import { createVar, style } from "@vanilla-extract/css";

// 完了＝緑、失敗＝赤。形の変化は同じで、色だけを切り替える。
const tone = createVar();
const toneSoft = createVar();

// ホバー・押下の見た目は、押せるときだけ（無効・処理中は除く）。
const canHover = ':hover:not(:disabled):not([aria-disabled="true"])';
const canPress = ':active:not(:disabled):not([aria-disabled="true"])';

const ease = "var(--ease-standard)";
const emphasized = "var(--ease-emphasized)";

// 幅を固定して、周りの並びがずれないようにする（変形のあいだ）。
export const wrapper = style({
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	minWidth: "var(--box-width, 0)",
	minHeight: "var(--box-height, 0)",
	verticalAlign: "middle",

	selectors: {
		'&[data-full-width="true"]': { display: "flex", width: "100%" },
		'&[data-align="end"]': { justifySelf: "end" },
	},
});

export const button = style({
	position: "relative",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	flexShrink: 0,
	// 中のラベルより小さく縮めるため（変形のとき）。
	minWidth: 0,
	boxSizing: "border-box",
	minHeight: 44,
	paddingInline: 20,
	border: "1px solid transparent",
	borderRadius: "var(--radius-control)",
	font: "inherit",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
	lineHeight: 1,
	whiteSpace: "nowrap",
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
		'&[data-size="sm"]': { minHeight: 36, paddingInline: 16 },
		'&[data-size="lg"]': {
			minHeight: 52,
			paddingInline: 24,
			fontSize: "var(--font-size-md)",
		},
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 3,
		},

		// ---- 種類 ----
		'&[data-variant="primary"]': {
			color: "var(--color-on-primary)",
			background: "var(--color-primary)",
			borderColor: "var(--color-primary)",
			boxShadow: "var(--shadow-md)",
		},
		[`&[data-variant="primary"]${canHover}`]: {
			background: "var(--color-primary-hover)",
			borderColor: "var(--color-primary-hover)",
		},
		[`&[data-variant="primary"]${canPress}`]: {
			background: "var(--color-primary-pressed)",
			borderColor: "var(--color-primary-pressed)",
		},
		'&[data-variant="secondary"]': {
			color: "var(--color-text)",
			background: "var(--color-surface)",
			borderColor: "var(--color-border-strong)",
		},
		[`&[data-variant="secondary"]${canHover}`]: {
			background: "var(--color-surface-muted)",
		},
		'&[data-variant="danger"]': {
			color: "var(--color-error)",
			background: "var(--color-surface)",
			borderColor: "var(--color-error)",
		},
		[`&[data-variant="danger"]${canHover}`]: {
			background: "var(--color-error-soft)",
		},
		'&[data-variant="ghost"]': {
			color: "var(--color-text)",
			background: "transparent",
			fontWeight: "var(--font-weight-semibold)",
		},
		[`&[data-variant="ghost"]${canHover}`]: {
			background: "var(--color-surface-muted)",
		},
		[`&${canPress}`]: { transform: "translateY(1px) scale(0.98)" },

		// ---- 使えない（入力が足りないなど） ----
		"&:disabled": {
			color: "var(--color-text-disabled)",
			background: "var(--color-surface-muted)",
			borderColor: "var(--color-border)",
			boxShadow: "none",
			cursor: "not-allowed",
			transform: "none",
		},

		// ---- 処理中・完了・失敗（どの種類でも同じ形） ----
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
		// 完了の表示中は押せない。失敗の表示中は、すぐにやり直せる（色は変えない）。
		'&[data-phase="success"], &[data-phase="success-expanded"]': {
			pointerEvents: "none",
		},
		[`&[data-phase="error"]${canHover}, &[data-phase="error"]${canPress}`]: {
			background: "transparent",
			borderColor: "transparent",
		},
		[`&[data-phase="error-expanded"]${canHover}, &[data-phase="error-expanded"]${canPress}`]:
			{
				background: toneSoft,
				borderColor: toneSoft,
			},
	},
});

const inPhase = (phases: string[]) =>
	phases.map((p) => `${button}[data-phase="${p}"] &`).join(", ");

const resultPhases = ["success", "error", "success-expanded", "error-expanded"];

export const label = style({
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
