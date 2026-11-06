import { style } from "@vanilla-extract/css";

export const container = style({
	display: "grid",
	gap: 16,
	maxWidth: 760,
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-xl)",
});

export const lead = style({
	margin: 0,
	color: "var(--color-text-muted)",
});

export const sectionTitle = style({
	margin: "0 0 8px",
	fontSize: "var(--font-size-lg)",
});

export const blocks = style({
	display: "grid",
	gap: 8,
});

// 取り込んだ結果の行のまとまり。親の変更は主色の地、自分で直したところは灰色の地。
export const lines = style({
	display: "grid",
	gap: 2,
	padding: "4px 8px",
	borderRadius: 8,
	selectors: {
		'&[data-source="parent"]': { background: "var(--color-primary-soft)" },
		'&[data-source="mine"]': { background: "var(--color-surface-muted)" },
	},
});

export const line = style({
	margin: 0,
	overflowWrap: "anywhere",
});

export const sourceLabel = style({
	display: "block",
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-xs)",
	fontWeight: "var(--font-weight-semibold)",
});

export const empty = style({
	margin: 0,
	color: "var(--color-text-muted)",
});

export const conflict = style({
	display: "grid",
	gap: 8,
	padding: 12,
	border: "1.5px solid var(--color-warning)",
	borderRadius: 12,
});

export const conflictTitle = style({
	margin: 0,
	fontWeight: "var(--font-weight-bold)",
});

export const sides = style({
	display: "grid",
	gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
	gap: 12,
});

export const actions = style({
	display: "flex",
	flexWrap: "wrap",
	gap: 8,
});

export const hint = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});
