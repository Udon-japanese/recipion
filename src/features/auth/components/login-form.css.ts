import { globalStyle, style } from "@vanilla-extract/css";

export const form = style({
	display: "flex",
	flexDirection: "column",
	gap: 16,
});

export const lead = style({
	margin: 0,
	fontSize: 16,
	lineHeight: 1.7,
});

export const field = style({
	display: "flex",
	flexDirection: "column",
	gap: 8,
});

export const label = style({
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
	lineHeight: 1.35,
});

export const consent = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: 12,
	lineHeight: 1.7,
});

globalStyle(`${consent} a`, {
	color: "var(--color-accent-text)",
	textDecoration: "underline",
	textUnderlineOffset: 3,
});

// Invisible の Turnstile の置き場。画面には何も出ないので、並びの外に置く（空の要素で、上下の間隔が二重にならないように）。
export const botCheckHost = style({
	position: "absolute",
	width: 0,
	height: 0,
	overflow: "hidden",
});
