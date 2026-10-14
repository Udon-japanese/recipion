import { style } from "@vanilla-extract/css";

export const container = style({
	width: "min(100% - 32px, 640px)",
	marginInline: "auto",
	marginBlock: 16,
});

export const body = style({ display: "grid", gap: 12 });

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-bold)",
});

export const note = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-relaxed)",
});

export const passphrase = style({
	margin: 0,
	padding: "12px 16px",
	background: "var(--color-primary-soft)",
	borderRadius: 12,
	fontSize: "var(--font-size-xl)",
	fontWeight: "var(--font-weight-bold)",
	letterSpacing: "0.04em",
	wordBreak: "break-all",
});

export const actions = style({ display: "flex", flexWrap: "wrap", gap: 8 });
