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
