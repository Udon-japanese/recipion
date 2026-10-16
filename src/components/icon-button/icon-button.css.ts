import { style } from "@vanilla-extract/css";

// 見た目は 36px の丸。押せる範囲は、44px 以上（::before で広げる）。
export const button = style({
	position: "relative",
	display: "grid",
	placeItems: "center",
	flex: "none",
	width: 36,
	height: 36,
	padding: 0,
	border: 0,
	borderRadius: "50%",
	background: "var(--color-surface-muted)",
	color: "var(--color-text)",
	cursor: "pointer",
	WebkitTapHighlightColor: "transparent",
	transition: `background-color var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)`,

	selectors: {
		"&::before": { content: '""', position: "absolute", inset: -4 },
		'&[data-size="std"]': { width: 44, height: 44 },
		'&[data-size="std"]::before': { inset: 0 },
		'&[data-tone="plain"]': { background: "transparent" },
		'&[data-tone="danger"]': { color: "var(--color-error)" },
		// 並べ替えのつかみ：指で触れたとき、ブラウザのスクロールに奪われない。
		"&[data-drag-handle]": {
			touchAction: "none",
			cursor: "grab",
			userSelect: "none",
			WebkitUserSelect: "none",
			WebkitTouchCallout: "none",
		},
		'&[data-tone="on"]': {
			background: "var(--color-primary)",
			border: "2px solid var(--color-text)",
			color: "var(--color-on-primary)",
		},
		"&:hover:not(:disabled):not([aria-disabled='true'])": {
			background: "var(--color-border)",
		},
		'&[data-tone="plain"]:hover:not(:disabled):not([aria-disabled="true"])': {
			background: "var(--color-surface-muted)",
		},
		"&:active:not(:disabled)": { transform: "scale(0.94)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: 2,
		},
		"&:disabled": {
			color: "var(--color-text-disabled)",
			cursor: "not-allowed",
		},
	},
});
