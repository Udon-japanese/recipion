import { keyframes, style } from "@vanilla-extract/css";

const blink = keyframes({
	"0%, 92%, 100%": { transform: "translateX(var(--eye-shift, 0em)) scaleY(1)" },
	"96%": { transform: "translateX(var(--eye-shift, 0em)) scaleY(0.1)" },
});
const lookAround = keyframes({
	"0%, 100%": { transform: "translateX(-0.7em)" },
	"50%": { transform: "translateX(0.7em)" },
});
const bob = keyframes({
	"0%, 100%": { transform: "translateY(0)" },
	"50%": { transform: "translateY(-0.5em)" },
});
const lean = keyframes({
	"0%, 100%": { transform: "rotate(-14deg)" },
	"50%": { transform: "rotate(-21deg) translateY(0.2em)" },
});
const breathe = keyframes({
	"0%, 100%": { transform: "scale(1.06, 0.84)" },
	"50%": { transform: "scale(1.02, 0.9)" },
});
const floatZ = keyframes({
	"0%": { opacity: 0, transform: "translate(0, 0) scale(0.7)" },
	"30%": { opacity: 1 },
	"100%": { opacity: 0, transform: "translate(2em, -5em) scale(1.1)" },
});
const cheer = keyframes({
	"0%, 100%": { transform: "translateY(0) scale(1, 1)" },
	"25%": { transform: "translateY(0) scale(1.12, 0.82)" },
	"55%": { transform: "translateY(-3.6em) scale(0.92, 1.12)" },
	"80%": { transform: "translateY(0) scale(1.1, 0.86)" },
});

// 単位は em。場面の高さ（cqh）に比例して大きさが変わる。
export const pet = style({
	position: "absolute",
	zIndex: 4,
	// 足元の中心が、置いた位置。
	transform: "translate(-50%, -100%)",
	width: "11em",
	height: "10.4em",
	fontSize: "0.625cqh",
	padding: 0,
	border: 0,
	background: "none",
	cursor: "pointer",
	selectors: {
		'&[data-static="true"]': {
			position: "absolute",
			transform: "none",
		},
	},
});

export const hopLayer = style({
	display: "block",
	width: "100%",
	height: "100%",
	vars: { "--hop": "0", "--sx": "1", "--sy": "1", "--face": "0" },
	transformOrigin: "50% 100%",
	transform: "translateY(calc(var(--hop) * -1em)) scale(var(--sx), var(--sy))",
});

export const body = style({
	boxSizing: "border-box",
	position: "relative",
	display: "block",
	width: "100%",
	height: "100%",
	borderRadius: "50% 50% 38% 38% / 58% 58% 42% 42%",
	background: "var(--color-mascot)",
	transformOrigin: "50% 100%",
	vars: { "--eye-shift": "0em" },
	selectors: {
		"&::before, &::after": {
			content: '""',
			position: "absolute",
			top: "3em",
			width: "1.5em",
			height: "2.75em",
			borderRadius: 999,
			background: "var(--color-text)",
			transformOrigin: "center",
			// 進む向きへ、目を寄せる。
			transform: "translateX(calc(var(--face, 0) * 0.5em)) scaleY(1)",
			animation: `${blink} 4.6s infinite`,
		},
		"&::before": { left: "2.75em" },
		"&::after": { right: "2.75em" },
		'[data-mood="idle"] &': { animation: `${bob} 2.4s ease-in-out infinite` },
		'[data-mood="look"] &::before, [data-mood="look"] &::after': {
			animation: `${lookAround} 2.8s ease-in-out infinite`,
		},
		'[data-mood="peek"] &': {
			animation: `${lean} 2.2s ease-in-out infinite`,
			transformOrigin: "100% 100%",
		},
		'[data-mood="peek"] &::before, [data-mood="peek"] &::after': {
			animation: "none",
			transform: "translate(-0.9em, 0.8em)",
		},
		'[data-mood="sleep"] &': {
			animation: `${breathe} 3.4s ease-in-out infinite`,
		},
		'[data-mood="sleep"] &::before, [data-mood="sleep"] &::after': {
			animation: "none",
			top: "5.4em",
			height: "0.7em",
			width: "2em",
			transform: "none",
		},
		'[data-mood="cheer"] &': { animation: `${cheer} 0.75s ease-out 2` },
	},
});

export const zzz = style({
	position: "absolute",
	top: "-1em",
	right: "-1em",
	fontSize: "3.4em",
	fontWeight: 700,
	color: "var(--color-text-muted)",
	animation: `${floatZ} 2.6s ease-out infinite`,
	pointerEvents: "none",
});

// 頭の上のふきだし。れしぽよについて歩く。飾りなので、操作は通す。
export const bubble = style({
	position: "absolute",
	left: "50%",
	// いちばん高く跳ねたとき（歩く跳ね・喜ぶ跳ね）でも、頭が当たらない高さに置く。
	bottom: "calc(100% + 4.2cqh)",
	zIndex: 1,
	width: "max-content",
	maxWidth: "29cqh",
	boxSizing: "border-box",
	padding: "1.25cqh 1.9cqh",
	borderRadius: "2.5cqh",
	background: "var(--color-surface)",
	border: "2px solid var(--color-text)",
	color: "var(--color-text)",
	fontSize: "2.1cqh",
	fontWeight: 700,
	lineHeight: 1.45,
	textAlign: "left",
	pointerEvents: "none",
	opacity: 0,
	transform: "translate(-50%, 0.5cqh)",
	transition: "opacity 200ms, transform 200ms",
	selectors: {
		'&[data-visible="true"]': {
			opacity: 1,
			transform: "translate(-50%, 0)",
		},
		"&::after": {
			content: '""',
			position: "absolute",
			left: "50%",
			bottom: "-0.9cqh",
			width: "1.5cqh",
			height: "1.5cqh",
			background: "var(--color-surface)",
			borderRight: "2px solid var(--color-text)",
			borderBottom: "2px solid var(--color-text)",
			transform: "translateX(-50%) rotate(45deg)",
		},
	},
});

export const srOnly = style({
	position: "absolute",
	width: 1,
	height: 1,
	overflow: "hidden",
	clip: "rect(0 0 0 0)",
	whiteSpace: "nowrap",
});
