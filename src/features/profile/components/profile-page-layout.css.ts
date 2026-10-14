import { style } from "@vanilla-extract/css";

export const page = style({
	display: "grid",
	alignContent: "start",
	gap: 32,
	width: "min(100% - 32px, 560px)",
	marginInline: "auto",
	paddingBlock: 16,
});

export const signOut = style({
	display: "grid",
	justifyItems: "start",
	gap: 12,
});
