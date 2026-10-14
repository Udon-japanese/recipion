import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 16,
});

export const title = style({
	margin: 0,
	fontWeight: "var(--font-weight-bold)",
});

export const message = style({
	margin: "4px 0 0",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

// 2つのボタンは、48px で並べる（狭い画面では、2つが同じ幅）。
export const actions = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
	gap: 12,
});
