import { keyframes, style } from "@vanilla-extract/css";

const spin = keyframes({ to: { transform: "rotate(360deg)" } });

// 見た目は3つ（tone）：
// - dark：暗い丸薬（操作の結果に「元に戻す」を添えるもの）
// - info：白い丸薬に、黄色の丸の中で回るアイコン（読み込み中・同期中）
// - success：白い丸薬に、緑の丸の中のチェック（終わった）
export const toast = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 12,
	minHeight: 48,
	boxSizing: "border-box",
	// 右に操作がないときは、文字の右にも、左と同じだけの余白をとる。
	padding: "8px 20px 8px 16px",
	borderRadius: 9999,
	fontSize: "var(--font-size-sm)",
	lineHeight: 1.45,
	boxShadow: "var(--shadow-md)",
	selectors: {
		'&[data-tone="dark"]': {
			background: "var(--color-text)",
			color: "var(--color-surface)",
		},
		'&[data-tone="info"], &[data-tone="success"]': {
			paddingLeft: 8,
			background: "var(--color-surface)",
			color: "var(--color-text)",
			border: "1px solid var(--color-border)",
		},
		// 右に操作があるときは、ボタンを右の端に寄せる。
		"&[data-has-action]": { paddingRight: 8 },
	},
});

export const action = style({
	display: "inline-flex",
	alignItems: "center",
	gap: 4,
	height: 36,
	padding: "0 14px",
	border: "1.5px solid var(--color-surface)",
	borderRadius: 9999,
	background: "transparent",
	color: "var(--color-surface)",
	font: "inherit",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
	cursor: "pointer",
	position: "relative",

	selectors: {
		"&::before": { content: '""', position: "absolute", inset: -4 },
		"&:hover": { background: "rgba(255, 255, 255, 0.12)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-surface)",
			outlineOffset: 2,
		},
	},
});

// 文の前のアイコン（処理中は回す）。明るい見た目では、色の丸に入れる。
export const icon = style({
	flex: "none",
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	selectors: {
		[`${toast}[data-tone="info"] &, ${toast}[data-tone="success"] &`]: {
			width: 32,
			height: 32,
			borderRadius: "50%",
		},
		[`${toast}[data-tone="info"] &`]: {
			background: "var(--color-primary-soft)",
		},
		[`${toast}[data-tone="success"] &`]: {
			background: "var(--color-success-soft)",
			color: "var(--color-success)",
		},
	},
});

// 回るのは、中のアイコンだけ（丸は回さない）。
export const glyph = style({
	display: "inline-flex",
	selectors: {
		'&[data-spinning="true"]': { animation: `${spin} 1s linear infinite` },
	},
	"@media": {
		"(prefers-reduced-motion: reduce)": {
			selectors: { '&[data-spinning="true"]': { animation: "none" } },
		},
	},
});
