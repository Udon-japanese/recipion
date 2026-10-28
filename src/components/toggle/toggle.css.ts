import { style } from "@vanilla-extract/css";

// 押せる範囲は 44px 四方以上。見た目は、幅 44・高さ 26 の溝と、丸いつまみ。
export const root = style({
	position: "relative",
	display: "inline-grid",
	placeItems: "center",
	flex: "none",
	width: 52,
	height: 44,
});

export const input = style({
	position: "absolute",
	inset: 0,
	width: "100%",
	height: "100%",
	margin: 0,
	opacity: 0,
	cursor: "pointer",

	selectors: {
		"&:disabled": { cursor: "not-allowed" },
	},
});

export const track = style({
	boxSizing: "border-box",
	position: "relative",
	width: 44,
	height: 26,
	borderRadius: 13,
	border: "2px solid var(--color-control-border)",
	background: "var(--color-surface)",
	pointerEvents: "none",
	transition: `background-color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)`,

	selectors: {
		[`${input}:checked + &`]: {
			background: "var(--color-primary)",
			borderColor: "var(--color-text)",
		},
		[`${input}:focus-visible + &`]: {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
		[`${input}:disabled + &`]: {
			borderColor: "var(--color-border)",
			background: "var(--color-surface-muted)",
		},
	},
});

// つまみ（色だけに頼らないよう、入のときは、右に寄る）。
export const thumb = style({
	position: "absolute",
	top: 2,
	left: 2,
	width: 18,
	height: 18,
	borderRadius: "50%",
	background: "var(--color-control-border)",
	transition: `transform var(--duration-fast) var(--ease-standard), background-color var(--duration-fast) var(--ease-standard)`,

	selectors: {
		[`${input}:checked + ${track} &`]: {
			transform: "translateX(18px)",
			background: "var(--color-text)",
		},
	},
});
