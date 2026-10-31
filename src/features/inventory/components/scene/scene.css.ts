import { globalStyle, keyframes, style } from "@vanilla-extract/css";

// 部屋の場面。絵（SVG）は固定の座標（中央の400×640と、左右に200ずつの余白）で描き、押せる場所は、その上に % で重ねる。
// 画面が狭いと、左右の余白から削れる（中央の400は、いつも見える）。
export const stage = style({
	width: "100%",
	containerType: "inline-size",
});

export const frame = style({
	position: "relative",
	// 画面の高さから、まわりの分（スマホ：上のバー 56・余白 16×2・下のナビ 57。PC：余白 32×2）を引く。
	// 引く分が足りないと、ページが少しスクロールする（app-shell.css.ts と合わせる）。
	vars: {
		"--h": "min(calc(100dvh - 145px - env(safe-area-inset-bottom)), 160cqw)",
	},
	"@media": {
		"(min-width: 768px)": {
			vars: { "--h": "min(calc(100dvh - 64px), 160cqw)" },
		},
	},
	boxSizing: "border-box",
	height: "var(--h)",
	width: "min(100%, calc(var(--h) * 1.25))",
	margin: "0 auto",
	overflow: "hidden",
	// 文字や余白は、絵の高さ（cqh）に合わせる。
	containerType: "size",
	border: "2px solid var(--color-border-strong)",
	borderRadius: 28,
	background: "#f2d9a6",
});

// 絵と、その上の押せる場所をまとめる層。高さは場面いっぱい、幅は 800:640。左右の中央に置く。
export const camera = style({
	position: "absolute",
	top: 0,
	bottom: 0,
	left: "50%",
	aspectRatio: "800 / 640",
	transformOrigin: "0 0",
	transition: "transform 760ms cubic-bezier(0.5, 0, 0.2, 1)",
	vars: { "--cx": "50", "--cy": "50", "--zoom": "1", "--aim": "50" },
	transform:
		"translateX(-50%) translate(calc(50% - var(--cx) * var(--zoom) * 1%), calc(var(--aim) * 1% - var(--cy) * var(--zoom) * 1%)) scale(var(--zoom))",
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

// 動きを減らす設定のときは、カメラ・扉・引き出しの動きを止める。
globalStyle(`${camera}, ${fridgeDoor}, ${drawer}`, {
	"@media": {
		"(prefers-reduced-motion: reduce)": { transition: "none" },
	},
});

export const fade = style({ transition: "opacity 700ms ease" });

// 押せる場所（絵の上に重ねる透明なボタン）。ズーム中は押せない。
export const hit = style({
	position: "absolute",
	display: "flex",
	alignItems: "flex-end",
	justifyContent: "flex-start",
	padding: "1cqh",
	boxSizing: "border-box",
	border: 0,
	borderRadius: "1.9cqh",
	background: "transparent",
	cursor: "pointer",
	fontSize: "2cqh",
	selectors: {
		"&:focus-visible": {
			outline: "3px solid var(--color-text)",
			outlineOffset: 2,
		},
		'&[data-hidden="true"]': { pointerEvents: "none" },
	},
	transition: "opacity 240ms",
});

globalStyle(`${hit}[data-hidden="true"] > *`, { opacity: 0 });

// 場所の名札：扉に貼った紙（貼り紙）と同じ、ベージュの紙＋墨の枠。影や白い丸薬型にしない。
export const tag = style({
	position: "relative",
	display: "inline-flex",
	alignItems: "center",
	gap: "0.45em",
	padding: "0.3em 0.8em 0.3em 0.6em",
	borderRadius: "0.5em",
	background: "#fff3c4",
	border: "2.5px solid var(--color-text)",
	color: "var(--color-text)",
	fontWeight: 700,
	lineHeight: 1.2,
	whiteSpace: "nowrap",
	transform: "rotate(-2deg)",
	transition: "transform 160ms var(--ease-emphasized)",
	selectors: {
		// 上にマスキングテープ。
		"&::before": {
			content: '""',
			position: "absolute",
			left: "50%",
			top: "-0.7em",
			width: "2.4em",
			height: "0.8em",
			transform: "translateX(-50%) rotate(3deg)",
			background: "rgba(233, 169, 0, 0.75)",
			borderRadius: 2,
		},
	},
});

globalStyle(`${hit}:hover > ${tag}, ${hit}:focus-visible > ${tag}`, {
	transform: "translateY(-0.25cqh) rotate(0deg)",
});

globalStyle(`${hit}:focus-visible > ${tag}`, {
	outline: "3px solid var(--color-focus)",
	outlineOffset: 3,
});

// 期限が近い・切れた件数：札の角に付く赤い丸（絵の中のマグネットと同じ作り）。
export const alert = style({
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	minWidth: "1.5em",
	height: "1.5em",
	padding: "0 0.25em",
	boxSizing: "border-box",
	borderRadius: 999,
	background: "var(--color-error)",
	border: "2px solid var(--color-text)",
	color: "var(--color-on-error)",
	fontSize: "0.85em",
	fontWeight: 700,
});

// 操作のボタン（絵の右上）。背景は敷かず、ボタンごとに、白い台に乗せる。空いたところは、絵を押せるようにする。
export const bar = style({
	position: "absolute",
	top: 10,
	left: 12,
	right: 12,
	zIndex: 7,
	display: "flex",
	alignItems: "center",
	justifyContent: "flex-end",
	gap: 8,
	pointerEvents: "none",
});

globalStyle(`${bar} > *`, { pointerEvents: "auto" });

globalStyle(`${bar} [data-tools]`, {
	padding: 4,
	gap: 4,
	borderRadius: 9999,
	background: "var(--color-surface)",
	boxShadow: "var(--shadow-sm)",
});

globalStyle(`${bar} [data-tools] button`, { background: "transparent" });

// 庫内の外側（押すと、おうちにもどる）。
export const backdrop = style({
	position: "absolute",
	inset: 0,
	zIndex: 4,
	border: 0,
	padding: 0,
	background: "rgba(41, 39, 32, 0.28)",
	cursor: "pointer",
});

// ---------- 庫内（ズームしたあと） ----------

const pop = keyframes({
	from: { opacity: 0, transform: "translateY(6px) scale(0.98)" },
	to: { opacity: 1, transform: "translateY(0) scale(1)" },
});

// 庫内：左の縦タブと、パネルを横に並べる。
export const interiorWrap = style({
	position: "absolute",
	top: 64,
	right: 0,
	bottom: "1.9cqh",
	left: 0,
	boxSizing: "border-box",
	width: "min(100%, 560px)",
	paddingInline: "1.9cqh",
	margin: "0 auto",
	zIndex: 6,
	display: "flex",
	alignItems: "flex-start",
	gap: 6,
	// スマホでは、上の道具（2つの丸い枠）の下に、すき間をあけて始める。
	"@media": {
		"(max-width: 767px)": { top: 76 },
	},
	// 空いたところは、外側として押せるようにする。
	pointerEvents: "none",
});

globalStyle(`${interiorWrap} > *`, { pointerEvents: "auto" });

export const interior = style({
	boxSizing: "border-box",
	position: "relative",
	flex: 1,
	minWidth: 0,
	// 中身が少ないときは、低く。多いときは、画面いっぱいまで（中でスクロール）。
	alignSelf: "flex-start",
	maxHeight: "100%",
	outline: "none",
	display: "flex",
	flexDirection: "column",
	gap: 12,
	padding: "12px 12px 0",
	border: "2px solid var(--color-border-strong)",
	borderRadius: "var(--radius-sheet)",
	background: "var(--color-background)",
	boxShadow: "var(--shadow-md)",
	animation: `${pop} 320ms var(--ease-emphasized) both`,
});

export const interiorHead = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	margin: 0,
	fontSize: "var(--font-size-lg)",
});

export const count = style({
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-regular)",
	color: "var(--color-text-muted)",
});

export const interiorScroll = style({
	display: "grid",
	alignContent: "start",
	gap: 12,
	flex: 1,
	minHeight: 0,
	paddingBottom: 20,
	overflowY: "auto",
});
