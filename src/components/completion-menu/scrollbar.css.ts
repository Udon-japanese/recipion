import { style } from "@vanilla-extract/css";

// 補完の一覧の、細いスクロールバー（常に出す。続きがあることが、見て分かるように）。
// Chrome・Safari：::-webkit-scrollbar に幅を指定すると、macOS の重ねて出すスクロールバーでも、常に出る。
// Chrome は、scrollbar-width・scrollbar-color があると ::-webkit-scrollbar を使わないので、標準の指定は、それがないブラウザ（Firefox）だけにする。
export const thinScrollbar = style({
	selectors: {
		"&::-webkit-scrollbar": {
			width: 10,
			height: 10,
		},
		"&::-webkit-scrollbar-track": {
			background: "transparent",
			// 丸角に、かからないように。
			marginBlock: 8,
		},
		"&::-webkit-scrollbar-thumb": {
			// 透明の枠で、つまみを細く見せる（見える幅は 6px）。
			border: "2px solid transparent",
			borderRadius: 999,
			backgroundClip: "padding-box",
			backgroundColor: "var(--color-border-strong)",
		},
		"&::-webkit-scrollbar-thumb:hover": {
			backgroundColor: "var(--color-control-border)",
		},
	},
	"@supports": {
		"not selector(::-webkit-scrollbar)": {
			scrollbarWidth: "thin",
			scrollbarColor: "var(--color-border-strong) transparent",
		},
	},
});
