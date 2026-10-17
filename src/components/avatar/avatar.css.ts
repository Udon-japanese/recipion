import { style } from "@vanilla-extract/css";

export const avatar = style({
	display: "flex",
	justifyContent: "center",
	alignItems: "center",
	flex: "none",
	width: 36,
	height: 36,
	borderRadius: "50%",
	background: "var(--color-primary-soft)",
	border: "1.5px solid var(--color-control-border)",
	fontSize: "var(--font-size-sm)",
	fontWeight: "var(--font-weight-bold)",
	lineHeight: 1,
	color: "var(--color-text)",
});
