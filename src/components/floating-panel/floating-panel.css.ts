import { style } from "@vanilla-extract/css";

// 浮いたパネル（PC。見出しをつかんで動かせる）。
export const panel = style({
	boxSizing: "border-box",
	position: "fixed",
	zIndex: 30,
	display: "flex",
	flexDirection: "column",
	// floating-panel.tsx の floatingPanelWidth と同じ値（位置の計算に使う）。
	width: 440,
	maxHeight: "calc(100dvh - 48px)",
	overflow: "hidden",
	background: "var(--color-surface)",
	borderRadius: "var(--radius-dialog)",
	boxShadow: "var(--shadow-md)",
	color: "var(--color-text)",
});

export const header = style({
	cursor: "grab",
	touchAction: "none",
	userSelect: "none",
	display: "flex",
	alignItems: "center",
	gap: 8,
	flex: "none",
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
	outline: "none",
});

export const body = style({
	flex: 1,
	minHeight: 0,
	padding: "8px 16px 16px",
	overflowY: "auto",
	overscrollBehavior: "contain",
});

export const footer = style({
	display: "flex",
	flex: "none",
	gap: 12,
	padding: 12,
	borderTop: "1px solid var(--color-border)",
});
