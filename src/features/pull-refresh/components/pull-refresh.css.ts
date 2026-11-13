import { style } from "@vanilla-extract/css";
import { PULL_INDICATOR_SIZE_PX } from "../domain/pull-refresh-physics";

// 引っ張って降りてくる丸（mascot が描かれている）。操作の邪魔をしないよう、押せない・画面の上に重なる。
export const indicator = style({
	position: "fixed",
	top: 0,
	left: "50%",
	zIndex: 20,
	pointerEvents: "none",
	display: "grid",
	placeItems: "center",
	boxSizing: "border-box",
	width: PULL_INDICATOR_SIZE_PX,
	height: PULL_INDICATOR_SIZE_PX,
	overflow: "hidden",
	borderRadius: "50%",
	border: "1px solid var(--color-border)",
	background: "var(--color-surface)",
	boxShadow: "0 2px 8px rgba(41, 39, 32, 0.14)",
	willChange: "transform, opacity",
});
