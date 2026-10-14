import { style } from "@vanilla-extract/css";

// --mascot-unit：基準の大きさ（幅19）の 1 に当たる長さ。
const unit = "var(--mascot-unit, 1px)";

// 動ける範囲（舞台）。基準は 52×52。
export const stage = style({
	display: "inline-grid",
	placeItems: "center",
	width: `calc(52 * ${unit})`,
	height: `calc(52 * ${unit})`,
	overflow: "hidden",
});

export const body = style({
	position: "relative",
	width: `calc(19 * ${unit})`,
	height: `calc(18 * ${unit})`,
	boxSizing: "border-box",
	// 動き（形・傾き）は、フックが毎フレーム書き換える。
	borderRadius: "50% 50% 38% 38% / 58% 58% 42% 42%",
	background: "var(--color-mascot)",
	// 縁（既定は、なし）。--mascot-outline-width と --mascot-outline-color で、外から指定できる。
	border:
		"var(--mascot-outline-width, 0px) solid var(--mascot-outline-color, transparent)",
	// 足元を基準に変形させる。
	transformOrigin: "50% 100%",
	willChange: "transform, border-radius",

	vars: {
		"--eye-x": "0px",
		"--eye-scale-y": "1",
	},

	selectors: {
		"&::before, &::after": {
			content: '""',
			position: "absolute",
			top: `calc(5 * ${unit})`,
			width: `calc(2.6 * ${unit})`,
			height: `calc(5 * ${unit})`,
			borderRadius: 999,
			background: "var(--color-text)",
			transformOrigin: "center",
			transform: "translateX(var(--eye-x)) scaleY(var(--eye-scale-y))",
		},
		"&::before": { left: `calc(5 * ${unit})` },
		"&::after": { right: `calc(5 * ${unit})` },
	},
});
