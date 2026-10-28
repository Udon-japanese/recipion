import { createVar, keyframes, style } from "@vanilla-extract/css";

// 角のボタンの円の半径。画面の中に見えるのは、四分の一（半径 × 半径）。
const radius = createVar();

const dropIn = keyframes({
	from: { opacity: 0, transform: "translateY(-16px) scale(0.97)" },
	to: { opacity: 1, transform: "none" },
});

const fadeIn = keyframes({ from: { opacity: 0 }, to: { opacity: 1 } });

export const root = style({
	position: "fixed",
	inset: 0,
	// 確認は、下のシートの上にも出る。
	zIndex: 30,
	display: "flex",
	justifyContent: "center",
	vars: { [radius]: "104px" },
});

// 後ろの画面が見える、薄い暗幕。
export const scrim = style({
	position: "absolute",
	inset: 0,
	background: "rgba(41, 39, 32, 0.16)",
	animation: `${fadeIn} var(--duration-normal) var(--ease-standard)`,
});

// 全幅。
export const stage = style({
	position: "relative",
	width: "100%",
	height: "100%",
	// 暗幕を押せるように、枠そのものは、クリックを通す。
	pointerEvents: "none",
	// フォーカスを受ける枠（輪郭は出さない）。
	outline: "none",
});

export const card = style({
	position: "absolute",
	left: 12,
	right: 12,
	maxWidth: 480,
	marginInline: "auto",
	pointerEvents: "auto",
	top: "calc(env(safe-area-inset-top, 0px) + 12px)",
	maxHeight: `calc(100% - ${radius} - 36px - env(safe-area-inset-top, 0px))`,
	display: "flex",
	flexDirection: "column",
	background: "var(--color-surface)",
	color: "var(--color-text)",
	borderRadius: "var(--radius-sheet)",
	boxShadow: "var(--shadow-md)",
	outline: "none",
	animation: `${dropIn} 420ms var(--ease-emphasized)`,

	"@media": {
		"(prefers-reduced-motion: reduce)": { animation: "none" },
	},

	selectors: {
		// PC：マウスは、画面の中ほどにいる。角は遠いので、カードの下に、右寄せで並べる。
		'&[data-layout="desktop"]': {
			left: 0,
			right: 0,
			top: 64,
			width: "min(520px, calc(100% - 48px))",
			maxWidth: "none",
			maxHeight: "calc(100% - 128px)",
		},
	},
});

// PC：カードの下の操作の行（戻す → 進む の順に、右へ）。
export const footer = style({
	flex: "none",
	display: "flex",
	justifyContent: "flex-end",
	gap: 12,
	padding: "12px 20px 16px",
	borderTop: "1px solid var(--color-border)",
});

export const header = style({
	flex: "none",
	padding: "20px 20px 8px",
});

export const eyebrow = style({
	margin: "0 0 4px",
	fontSize: "var(--font-size-xs)",
	color: "var(--color-text-muted)",
	letterSpacing: "0.06em",
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-bold)",
	lineHeight: 1.35,
});

export const body = style({
	flex: 1,
	minHeight: 0,
	overflowY: "auto",
	overscrollBehavior: "contain",
	padding: "4px 20px 20px",
});

export const corners = style({
	position: "absolute",
	left: 0,
	right: 0,
	bottom: 0,
	height: radius,
	overflow: "hidden",
	pointerEvents: "none",
});

export const corner = style({
	position: "absolute",
	bottom: `calc(${radius} * -1)`,
	width: `calc(${radius} * 2)`,
	height: `calc(${radius} * 2)`,
	boxSizing: "border-box",
	padding: 0,
	border: 0,
	borderRadius: "50%",
	font: "inherit",
	cursor: "pointer",
	pointerEvents: "auto",
	WebkitTapHighlightColor: "transparent",
	transition:
		"transform var(--duration-fast) var(--ease-standard), filter var(--duration-fast) var(--ease-standard)",

	selectors: {
		"&:active:not(:disabled)": { transform: "scale(0.94)" },
		"&:hover:not(:disabled)": { filter: "brightness(1.08)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-text)",
			outlineOffset: -6,
		},
		"&:disabled": {
			cursor: "default",
			color: "var(--color-text-disabled)",
			background: "var(--color-surface-muted)",
		},
		'&[aria-busy="true"]': { cursor: "progress" },
	},
});

// アイコンの場所（24px）に、マスコットを置く。舞台（52px 四方）は、はみ出してよい。
export const mark = style({
	display: "grid",
	placeItems: "center",
	width: 24,
	height: 24,
});

// 処理中は、文字もアイコンもなくし、マスコットだけにする（アイコン＋文字と同じ高さの真ん中）。
export const markPending = style({ height: 46 });

// 黄色い右のボタンでは、黄色い体が見えないので、白くする。
export const markOnPrimary = style({
	vars: { "--color-mascot": "var(--color-surface)" },
});

export const left = style({
	left: `calc(${radius} * -1)`,
	background: "var(--color-text)",
	color: "var(--color-surface)",
	boxShadow: "0 -6px 24px rgba(41, 39, 32, 0.2)",

	selectors: {
		// 処理中は、無効の灰色にせず、元の色のまま（マスコットが跳ねる）。
		'&:disabled[aria-busy="true"]': {
			background: "var(--color-text)",
			color: "var(--color-surface)",
		},
	},
});

export const right = style({
	right: `calc(${radius} * -1)`,
	background: "var(--color-primary)",
	color: "var(--color-on-primary)",
	boxShadow: "0 -6px 28px rgba(233, 169, 0, 0.4)",

	selectors: {
		'&:disabled[aria-busy="true"]': {
			background: "var(--color-primary)",
			color: "var(--color-on-primary)",
		},
	},
});

export const rightDanger = style({
	right: `calc(${radius} * -1)`,
	background: "var(--color-error)",
	color: "var(--color-on-error)",
	boxShadow: "0 -6px 28px rgba(200, 59, 50, 0.35)",

	selectors: {
		'&:disabled[aria-busy="true"]': {
			background: "var(--color-error)",
			color: "var(--color-on-error)",
		},
	},
});

// 見えている四分の一の中に置く。
export const label = style({
	position: "absolute",
	top: `calc(${radius} * 0.3)`,
	width: `calc(${radius} * 0.8)`,
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	gap: 4,
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
	lineHeight: 1.2,
	// 長いラベル（「すべて削除する」など）は、折り返す。
	textAlign: "center",
	overflowWrap: "anywhere",
	// 1文字だけ残らないよう、行の長さをそろえる。
	textWrap: "balance",
});

export const labelLeft = style({ left: `calc(${radius} + ${radius} * 0.06)` });
export const labelRight = style({
	right: `calc(${radius} + ${radius} * 0.06)`,
});
