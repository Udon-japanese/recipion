import { style } from "@vanilla-extract/css";

// PC（広い画面）は、タブを左に縦に並べる。
export const wide = "(min-width: 768px)";

export const page = style({
	display: "grid",
	alignContent: "start",
	gap: 16,
	width: "min(100% - 32px, 560px)",
	marginInline: "auto",
	paddingBlock: 16,
	"@media": {
		[wide]: { gap: 24, width: "min(100% - 48px, 840px)" },
	},
});

export const layout = style({
	display: "grid",
	alignItems: "start",
	gap: 24,
	"@media": {
		[wide]: { gridTemplateColumns: "180px minmax(0, 1fr)", gap: 40 },
	},
});

// 狭い画面：横に並べ、選んでいるタブに墨の下線。PC：縦に並べ、選んでいるタブを薄い黄色の地にする。
export const tabList = style({
	display: "flex",
	margin: 0,
	padding: 0,
	borderBottom: "1px solid var(--color-border)",
	overflowX: "auto",
	scrollbarWidth: "none",
	"@media": {
		[wide]: {
			position: "sticky",
			top: 16,
			flexDirection: "column",
			gap: 4,
			borderBottom: "none",
			overflowX: "visible",
		},
	},
});

export const tab = style({
	boxSizing: "border-box",
	display: "inline-flex",
	alignItems: "center",
	justifyContent: "center",
	flex: "1 0 auto",
	minHeight: 44,
	padding: "12px 12px 8px",
	// 下の細い線に重ねて、太い線を引く。
	marginBottom: -1,
	border: "none",
	borderBottom: "2px solid transparent",
	background: "none",
	color: "var(--color-text-muted)",
	font: "inherit",
	fontSize: "var(--font-size-md)",
	fontWeight: "var(--font-weight-semibold)",
	whiteSpace: "nowrap",
	cursor: "pointer",
	selectors: {
		"&:hover": { color: "var(--color-text)" },
		"&:focus-visible": {
			outline: "3px solid var(--color-focus)",
			outlineOffset: -3,
			borderRadius: 8,
		},
		'&[aria-selected="true"]': {
			borderBottomColor: "var(--color-text)",
			color: "var(--color-text)",
			fontWeight: "var(--font-weight-extrabold)",
		},
	},
	"@media": {
		[wide]: {
			flex: "none",
			justifyContent: "flex-start",
			width: "100%",
			padding: "10px 14px",
			marginBottom: 0,
			borderBottom: "none",
			borderRadius: 10,
			textAlign: "start",
			selectors: {
				"&:hover": { background: "var(--color-surface-muted)" },
				'&[aria-selected="true"]': {
					background: "var(--color-primary-soft)",
				},
			},
		},
	},
});

export const panel = style({
	display: "grid",
	gap: 32,
	minWidth: 0,
});

export const title = style({
	margin: 0,
	fontSize: "var(--font-size-xl)",
	fontWeight: "var(--font-weight-extrabold)",
	lineHeight: "var(--line-height-tight)",
});

export const section = style({
	display: "grid",
	gap: 12,
});

export const sectionTitle = style({
	margin: 0,
	fontSize: "var(--font-size-lg)",
	fontWeight: "var(--font-weight-bold)",
});

export const sectionHead = style({
	display: "flex",
	flexWrap: "wrap",
	alignItems: "baseline",
	justifyContent: "space-between",
	gap: 8,
});

export const sectionNote = style({
	margin: 0,
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const email = style({
	display: "grid",
	gap: 4,
	margin: 0,
});

export const emailLabel = style({
	color: "var(--color-text-muted)",
	fontSize: "var(--font-size-sm)",
});

export const emailValue = style({
	margin: 0,
	overflowWrap: "anywhere",
});

export const signOut = style({
	display: "grid",
	justifyItems: "start",
	gap: 12,
});
