import { style } from "@vanilla-extract/css";

export const root = style({ position: "relative" });

// ボタンの上に出す小さな欄（カードの一番下にあるので、上に開く）。
export const panel = style({
	boxSizing: "border-box",
	position: "absolute",
	right: 0,
	bottom: "calc(100% + 8px)",
	zIndex: 20,
	display: "grid",
	gap: 4,
	width: "max-content",
	maxWidth: "min(320px, calc(100vw - 32px))",
	padding: "8px 12px",
	background: "var(--color-surface)",
	border: "1.5px solid var(--color-border-strong)",
	borderRadius: 16,
	boxShadow: "var(--shadow-md)",
});

export const row = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 16,
	minHeight: 44,
});

export const label = style({
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-medium)",
	lineHeight: "var(--line-height-tight)",
	cursor: "pointer",
});
