import { style } from "@vanilla-extract/css";

export const page = style({
	display: "grid",
	alignContent: "start",
	gap: 32,
	width: "min(100% - 32px, 560px)",
	marginInline: "auto",
	paddingBlock: 16,
});

export const settingsLink = style({
	display: "inline-flex",
	alignItems: "center",
	justifySelf: "start",
	gap: 2,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
	textDecoration: "none",
	selectors: {
		"&:hover": { color: "var(--color-text)" },
	},
});
