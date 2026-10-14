import { style } from "@vanilla-extract/css";

export const container = style({
	width: "min(100% - 32px, 560px)",
	marginInline: "auto",
	paddingBlock: 24,
	display: "grid",
	gap: 16,
	color: "var(--color-text)",
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-xl)",
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: "var(--line-height-tight)",
});

export const text = style({ margin: 0, lineHeight: 1.7 });

export const form = style({ display: "grid", gap: 16 });
