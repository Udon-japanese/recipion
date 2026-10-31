import { style } from "@vanilla-extract/css";

export const container = style({ display: "grid", gap: 6 });

// 薄い黄色の帯：「パスフレーズ」とその値（左）、コピー・作り直す（右）。
export const bar = style({
	boxSizing: "border-box",
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 8,
	padding: "8px 8px 8px 16px",
	background: "var(--color-primary-soft)",
	borderRadius: 16,
});

export const text = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "baseline",
	gap: "4px 12px",
	minWidth: 0,
});

export const label = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-semibold)",
});

export const passphrase = style({
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-bold)",
	letterSpacing: "0.04em",
	wordBreak: "break-all",
});

export const actions = style({ display: "flex", gap: 4 });

export const note = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
	lineHeight: "var(--line-height-normal)",
});
