import { style } from "@vanilla-extract/css";

// 押せる範囲は 44px。見た目は 24px の角丸の箱。
export const root = style({
	position: "relative",
	display: "inline-grid",
	placeItems: "center",
	flex: "none",
	width: 44,
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

export const box = style({
	display: "grid",
	placeItems: "center",
	width: 24,
	height: 24,
	borderRadius: 8,
	border: "2px solid var(--color-control-border)",
	background: "var(--color-surface)",
	color: "var(--color-on-primary)",
	pointerEvents: "none",
	transition: `background-color var(--duration-fast) var(--ease-standard)`,

	selectors: {
		[`${input}:is(:checked, :indeterminate) + &`]: {
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

export const mark = style({
	// 行の高さで上にずれないよう、中央に置く。✓と横線は、同じ位置に重ねる。
	gridArea: "1 / 1",
	display: "grid",
	placeItems: "center",
	lineHeight: 0,
	opacity: 0,
	selectors: {
		[`${input}:checked:not(:indeterminate) + ${box} &`]: { opacity: 1 },
	},
});

export const dash = style({
	gridArea: "1 / 1",
	display: "grid",
	placeItems: "center",
	lineHeight: 0,
	opacity: 0,
	selectors: {
		[`${input}:indeterminate + ${box} &`]: { opacity: 1 },
	},
});
