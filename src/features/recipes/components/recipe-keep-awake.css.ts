import { style } from "@vanilla-extract/css";

export const row = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "flex-end",
	gap: 8,
	width: "min(100% - 32px, 640px)",
	marginInline: "auto",
	marginBottom: 8,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const text = style({ cursor: "pointer" });

export const hint = style({ marginLeft: 4, fontSize: "var(--font-size-xs)" });
