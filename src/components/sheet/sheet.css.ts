import { style } from "@vanilla-extract/css";

export const root = style({
	position: "fixed",
	inset: 0,
	zIndex: 20,
	// 背景の操作は、暗幕が受ける。
	pointerEvents: "none",
});

export const scrim = style({
	position: "absolute",
	inset: 0,
	background: "var(--color-overlay)",
	opacity: 0,
	pointerEvents: "auto",
	touchAction: "none",
});

export const panel = style({
	position: "absolute",
	left: 0,
	right: 0,
	bottom: "var(--sheet-bottom, 0px)",
	display: "flex",
	flexDirection: "column",
	maxHeight: "100%",
	background: "var(--color-surface)",
	borderRadius: "var(--radius-sheet) var(--radius-sheet) 0 0",
	boxShadow: "var(--shadow-sheet)",
	color: "var(--color-text)",
	pointerEvents: "auto",
	outline: "none",
	willChange: "transform",
	overflow: "hidden",

	selectors: {
		// 浮いたパネル（後ろの画面が見える）：輪郭をはっきりさせる。
		'&[data-modal="false"]': {
			border: "1px solid var(--color-border-strong)",
			boxShadow: "var(--shadow-md)",
		},
		// PC：右から出る 400px のパネル。
		'&[data-placement="right"]': {
			left: "auto",
			top: 0,
			bottom: 0,
			width: "min(400px, 100vw)",
			height: "auto",
			maxHeight: "none",
			borderRadius: "var(--radius-dialog) 0 0 var(--radius-dialog)",
			boxShadow: "var(--shadow-md)",
		},
	},
});

// つかんで動かせる部分（つかみ＋見出し）。
export const dragZone = style({
	flex: "none",
	touchAction: "none",
	userSelect: "none",
	WebkitUserSelect: "none",
	cursor: "grab",

	selectors: {
		'[data-dragging="true"] &': { cursor: "grabbing" },
		'[data-placement="right"] &': { cursor: "default", touchAction: "auto" },
	},
});

// つかみ（見た目は 36×4。押せる範囲は、見出しまで含めて広い）。
export const grabber = style({
	display: "flex",
	justifyContent: "center",
	height: 20,
	paddingTop: 8,

	selectors: {
		'[data-placement="right"] &': { display: "none" },
	},
});

export const grabBar = style({
	width: 36,
	height: 4,
	borderRadius: 4,
	background: "var(--color-border-strong)",
});

export const header = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	minHeight: 56,
	padding: "0 6px 0 20px",
});

export const title = style({
	flex: 1,
	minWidth: 0,
	margin: 0,
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-bold)",
	lineHeight: 1.3,
});

export const body = style({
	flex: 1,
	minHeight: 0,
	overflowY: "hidden",
	overscrollBehavior: "contain",

	selectors: {
		'&[data-scrollable="true"]': { overflowY: "auto" },
		'&[data-padded="true"]': { padding: "8px 16px 16px" },
	},
});

export const footer = style({
	flex: "none",
	display: "flex",
	alignItems: "center",
	gap: 12,
	padding: "12px 16px calc(12px + env(safe-area-inset-bottom, 0px))",
	background: "var(--color-surface)",
	borderTop: "1px solid var(--color-border)",
});
