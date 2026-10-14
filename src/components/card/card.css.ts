import { style } from "@vanilla-extract/css";

export const card = style({
	background: "var(--color-surface)",
	borderRadius: "var(--radius-card)",
	boxShadow: "var(--shadow-sm)",

	selectors: {
		'&[data-padding="md"]': { padding: 16 },
	},
});
