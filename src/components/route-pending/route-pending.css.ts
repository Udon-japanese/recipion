import { keyframes, style } from "@vanilla-extract/css";

const appear = keyframes({
	from: { opacity: 0 },
	to: { opacity: 1 },
});

// 中身の場所（ヘッダー・ナビの内側）の真ん中に出す。
export const root = style({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	gap: "var(--space-2)",
	minHeight: "60dvh",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
	// 静的シェルやコードの読み込みでは、遅延なしで出る。すぐ消えるときに目立たないよう、薄い所から出す。
	animation: `${appear} 300ms ease-in both`,

	"@media": {
		"(prefers-reduced-motion: reduce)": { animation: "none" },
	},
});

// 最初の読み込み：画面全体を覆い、画面の真ん中に出す（OS のスプラッシュのアイコンと同じ位置）。
// 背景は不透明にするので、薄い所から出さない（下のヘッダー・ナビが透けて見えないように）。
export const launch = style([
	root,
	{
		position: "fixed",
		inset: 0,
		zIndex: 100,
		minHeight: 0,
		background: "var(--color-background)",
		animation: "none",
	},
]);
