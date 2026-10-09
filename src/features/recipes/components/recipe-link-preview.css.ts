import { style } from "@vanilla-extract/css";

export const backdrop = style({
	position: "fixed",
	inset: 0,
	zIndex: 40,
	background: "rgba(0, 0, 0, 0.4)",
	border: "none",
	cursor: "default",
});

// 狭い画面は、下から出るシート。広い画面は、中央の枠。
export const panel = style({
	position: "fixed",
	zIndex: 41,
	display: "flex",
	flexDirection: "column",
	left: 0,
	right: 0,
	bottom: 0,
	maxHeight: "85vh",
	background: "var(--color-surface)",
	borderTopLeftRadius: 16,
	borderTopRightRadius: 16,
	boxShadow: "0 -4px 24px rgba(0, 0, 0, 0.2)",
	"@media": {
		"(min-width: 640px)": {
			top: "8vh",
			bottom: "auto",
			left: "50%",
			right: "auto",
			width: "min(640px, 92vw)",
			maxHeight: "84vh",
			transform: "translateX(-50%)",
			borderRadius: 16,
		},
	},
});

export const header = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 8,
	padding: "10px 16px",
	borderBottom: "1px solid var(--color-border)",
});

export const body = style({
	overflowY: "auto",
	padding: "0 16px 8px",
});

export const footer = style({
	padding: "10px 16px",
	borderTop: "1px solid var(--color-border)",
});

export const message = style({
	margin: 0,
	padding: 16,
	color: "var(--color-text-muted)",
});
