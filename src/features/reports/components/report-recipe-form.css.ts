import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 16,
	width: "min(100% - 32px, 640px)",
	marginInline: "auto",
	marginBlock: 8,
});

export const actions = style({ display: "flex", gap: 8 });
