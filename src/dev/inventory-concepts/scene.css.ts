import { globalStyle, style } from "@vanilla-extract/css";

// 部屋の場面。絵（SVG）は固定の座標（400×640）で描き、押せる場所とれしぽよは、その上に % で重ねる。
export const frame = style({
	position: "relative",
	width: "min(100%, calc((100dvh - 190px) * 0.625))",
	minWidth: 300,
	aspectRatio: "400 / 640",
	margin: "0 auto",
	overflow: "hidden",
	containerType: "inline-size",
	border: "2px solid var(--color-border-strong)",
	borderRadius: 28,
	background: "#f2d9a6",
});

export const camera = style({
	position: "absolute",
	inset: 0,
	transformOrigin: "0 0",
	transition: "transform 760ms cubic-bezier(0.5, 0, 0.2, 1)",
	vars: { "--cx": "50", "--cy": "50", "--zoom": "1", "--aim": "50" },
	transform:
		"translate(calc(50% - var(--cx) * var(--zoom) * 1%), calc(var(--aim) * 1% - var(--cy) * var(--zoom) * 1%)) scale(var(--zoom))",
});

export const art = style({
	position: "absolute",
	inset: 0,
	width: "100%",
	height: "100%",
	display: "block",
});

export const fridgeDoor = style({
	transformBox: "fill-box",
	transformOrigin: "left center",
	transition: "transform 460ms cubic-bezier(0.5, 0, 0.2, 1)",
	selectors: { '&[data-open="true"]': { transform: "scaleX(0.1)" } },
});

export const drawer = style({
	transition: "transform 460ms cubic-bezier(0.5, 0, 0.2, 1)",
	selectors: { '&[data-open="true"]': { transform: "translateY(7px)" } },
});

export const fade = style({ transition: "opacity 700ms ease" });

// 押せる場所（絵の上に重ねる透明なボタン）。ズーム中は押せない。
export const hit = style({
	position: "absolute",
	display: "flex",
	alignItems: "flex-end",
	justifyContent: "flex-start",
	padding: "1.6cqw",
	boxSizing: "border-box",
	border: 0,
	borderRadius: "3cqw",
	background: "transparent",
	cursor: "pointer",
	fontSize: "3.2cqw",
	selectors: {
		"&:hover": { background: "rgba(255, 255, 255, 0.18)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-text)",
			outlineOffset: 2,
		},
		'&[data-hidden="true"]': { pointerEvents: "none" },
	},
	transition: "opacity 240ms",
});

globalStyle(`${hit}[data-hidden="true"] > *`, { opacity: 0 });

export const tag = style({
	display: "inline-flex",
	alignItems: "center",
	gap: "0.5em",
	padding: "0.3em 0.9em 0.3em 0.6em",
	borderRadius: 999,
	background: "var(--color-surface)",
	border: "2px solid var(--color-text)",
	color: "var(--color-text)",
	fontWeight: 700,
	lineHeight: 1.2,
	whiteSpace: "nowrap",
	boxShadow: "0 0.2em 0 rgba(41, 39, 32, 0.18)",
});

export const alert = style({
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	minWidth: "1.7em",
	padding: "0 0.4em",
	borderRadius: 999,
	background: "var(--color-error)",
	color: "var(--color-on-error)",
	fontSize: "0.9em",
	fontWeight: 700,
});

export const bubble = style({
	position: "absolute",
	left: "3.5cqw",
	top: "3cqw",
	zIndex: 5,
	maxWidth: "46cqw",
	margin: 0,
	padding: "2cqw 3cqw",
	boxSizing: "border-box",
	borderRadius: "4cqw",
	background: "var(--color-surface)",
	border: "2px solid var(--color-text)",
	fontSize: "3.3cqw",
	fontWeight: 700,
	lineHeight: 1.45,
	transition: "opacity 300ms",
	selectors: {
		'&[data-hidden="true"]': { opacity: 0 },
		"&::after": {
			content: '""',
			position: "absolute",
			left: "6cqw",
			bottom: "-1.4cqw",
			width: "2.4cqw",
			height: "2.4cqw",
			background: "var(--color-surface)",
			borderRight: "2px solid var(--color-text)",
			borderBottom: "2px solid var(--color-text)",
			transform: "rotate(45deg)",
		},
	},
});
