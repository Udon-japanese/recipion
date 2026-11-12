import { style } from "@vanilla-extract/css";

// ボタンの上に出す小さな欄（カードの一番下にあるので、上に開く）。
// 位置の基準は、ボタンではなく、置いた側の行（「つくった！」の行。position: relative を付ける）。
// ボタンは「つくった！」の左にあるので、ボタンの右端に合わせると、長い文言の欄が画面の左へはみ出す。右端は行の右端にそろえ、幅は行に収める。
export const panel = style({
	boxSizing: "border-box",
	position: "absolute",
	right: 0,
	bottom: "calc(100% + 8px)",
	zIndex: 20,
	display: "grid",
	gap: 4,
	width: "max-content",
	maxWidth: "min(320px, 100%)",
	padding: "8px 12px",
	background: "var(--color-surface)",
	border: "1.5px solid var(--color-border-strong)",
	borderRadius: 16,
	boxShadow: "var(--shadow-md)",
});

export const row = style({
	display: "flex",
	alignItems: "center",
	justifyContent: "space-between",
	gap: 16,
	minHeight: 44,
});

export const label = style({
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-medium)",
	lineHeight: "var(--line-height-tight)",
	cursor: "pointer",
});
