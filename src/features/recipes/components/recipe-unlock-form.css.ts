import { style } from "@vanilla-extract/css";

export const container = style({
	width: "min(100% - 32px, 520px)",
	marginInline: "auto",
	paddingBlock: 24,
	display: "grid",
	gap: 12,
	color: "var(--color-text)",
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-xl)",
	fontWeight: "var(--font-weight-extrabold)",
});

export const note = style({
	margin: 0,
	color: "var(--color-text-muted)",
	lineHeight: "var(--line-height-relaxed)",
});

export const form = style({ display: "grid", gap: 16 });
