import { style } from "@vanilla-extract/css";

export const container = style({ display: "grid", gap: 8 });

export const heading = style({
	margin: 0,
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-bold)",
});

export const list = style({ margin: 0, padding: 0, listStyle: "none" });

// 1つの設定：名前と説明（左）、選ぶ部品（右）。
export const row = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 16,
	minHeight: 64,
	padding: "10px 16px 10px 20px",
	selectors: {
		"& + &": { borderTop: "1px solid var(--color-border)" },
	},
});

export const text = style({
	display: "grid",
	gap: 2,
	minWidth: 0,
});

export const label = style({
	fontWeight: "var(--font-weight-semibold)",
	cursor: "pointer",
});

export const hint = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});

export const select = style({ flex: "none", width: 160 });

export const note = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
	lineHeight: "var(--line-height-normal)",
});
