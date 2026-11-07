import { style } from "@vanilla-extract/css";

export const category = style({
	borderTop: "1px solid var(--color-border)",
	paddingBlock: 4,
	selectors: {
		"&[open]": { paddingBottom: 16 },
	},
});

export const summary = style({
	display: "flex",
	alignItems: "center",
	gap: 4,
	minHeight: 44,
	fontWeight: "var(--font-weight-semibold)",
	cursor: "pointer",
});

export const count = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-regular)",
});
