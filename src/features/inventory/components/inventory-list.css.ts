import { style } from "@vanilla-extract/css";

const WIDE = "(min-width: 1280px)";

export const container = style({
	display: "grid",
	gap: 16,
	minWidth: 0,
});

export const header = style({
	display: "flex",
	alignItems: "center",
	gap: 8,
	minHeight: 44,
});

export const title = style({
	flex: 1,
	margin: 0,
	fontSize: "var(--font-size-xl)",
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: 1.3,
});

// 冷蔵庫（左）と、食材のパネル（右。幅が広いときだけ固定）。
export const layout = style({
	display: "grid",
	gap: 24,
	alignItems: "start",
	"@media": {
		[WIDE]: { gridTemplateColumns: "minmax(0, 960px) 400px" },
	},
});

export const panelColumn = style({
	display: "none",
	"@media": {
		[WIDE]: { display: "block" },
	},
});

export const placeholder = style({
	display: "grid",
	placeItems: "center",
	minHeight: 240,
});

// 空・ゲスト・確認中：れしぽよと一言。
export const center = style({
	display: "grid",
	justifyItems: "center",
	gap: 12,
	padding: "48px 16px",
	color: "var(--color-text-muted)",
	textAlign: "center",
});

export const emptyFridge = style({
	boxSizing: "border-box",
	display: "grid",
	justifyItems: "center",
	padding: "40px 16px",
	border: "2px solid var(--color-border-strong)",
	borderRadius: 24,
	background: "var(--color-surface-muted)",
});

export const loadingBody = style({
	boxSizing: "border-box",
	display: "grid",
	gridTemplateColumns: "repeat(auto-fill, minmax(104px, 1fr))",
	gap: 8,
	padding: 12,
	border: "2px solid var(--color-border-strong)",
	borderRadius: 24,
	background: "var(--color-surface-muted)",
});

export const loadingText = style({
	margin: "8px 0 0",
	color: "var(--color-text-muted)",
	textAlign: "center",
});

export const srOnly = style({
	position: "absolute",
	width: 1,
	height: 1,
	overflow: "hidden",
	clip: "rect(0 0 0 0)",
	whiteSpace: "nowrap",
});
