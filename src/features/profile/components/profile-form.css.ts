import { style } from "@vanilla-extract/css";

export const container = style({
	width: "min(100% - 32px, 560px)",
	marginInline: "auto",
	paddingBlock: 24,
	color: "var(--color-text)",
});

export const title = style({
	margin: 0,
	fontSize: 24,
	fontWeight: 700,
});

export const lead = style({
	margin: "8px 0 20px",
	color: "var(--color-text-muted)",
	fontSize: 14,
});

export const form = style({
	display: "grid",
	gap: 16,
});

export const field = style({
	display: "grid",
	gap: 4,
});

export const input = style({
	minHeight: 44,
	padding: "8px 10px",
	background: "var(--color-surface)",
	border: "1px solid var(--color-border)",
	borderRadius: 8,
	font: "inherit",
});

export const handleRow = style({
	display: "flex",
	alignItems: "center",
	gap: 6,
});

export const handleInput = style([input, { flex: 1 }]);

export const hint = style({
	color: "var(--color-text-muted)",
	fontSize: 13,
});

export const error = style({
	margin: 0,
	color: "var(--color-error)",
	fontSize: 14,
});

export const actions = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "center",
	gap: 12,
});
