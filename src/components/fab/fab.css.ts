import { style } from "@vanilla-extract/css";

// 画面の右下に浮かせる、主役の丸いボタン（「＋」で追加する）。見た目だけ。置き場所は、fabCorner か、使う側で決める。
export const fab = style({
	boxSizing: "border-box",
	display: "grid",
	placeItems: "center",
	width: 56,
	height: 56,
	padding: 0,
	color: "var(--color-on-primary)",
	background: "var(--color-primary)",
	border: "none",
	borderRadius: "50%",
	boxShadow: "var(--shadow-md)",
	cursor: "pointer",
	WebkitTapHighlightColor: "transparent",
	transition: "transform var(--duration-fast) var(--ease-standard)",
	selectors: {
		"&:hover": { background: "var(--color-primary-hover)" },
		"&:active": { transform: "scale(0.94)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 3,
		},
	},
});

// スマホ（768px 未満）の右下に固定する。下部ナビ（64px）の上 16px。広い画面では出さない（題名の行の、文字つきのボタンを使う）。
// 一覧の最後が隠れないよう、使う画面の下に fabRoom の余白を空ける。
export const fabCorner = style({
	position: "fixed",
	right: 16,
	bottom: "calc(64px + 16px + env(safe-area-inset-bottom))",
	zIndex: 9,
	"@media": {
		"(min-width: 768px)": { display: "none" },
	},
});

// 右下のボタン（56）と、その上の間（16）の分。
export const fabRoom = 56 + 16;
