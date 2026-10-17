// メールの色と書体。メールソフトは CSS 変数を使えないので、値を直接持つ。
// 色は src/styles.css のトークンに合わせる（text: --color-text、accent: --color-mascot）。
export const colors = {
	page: "#fbf4de",
	card: "#ffffff",
	border: "#f1e5b5",
	text: "#292720",
	muted: "#7a7463",
	accent: "#e9a900",
	accentSoft: "#fff4cc",
	danger: "#b3261e",
} as const;

// 日本語のシステムフォント。メールでは Web フォントが使えない。
export const fontFamily =
	'-apple-system, BlinkMacSystemFont, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif';

export const monoFontFamily =
	"ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
