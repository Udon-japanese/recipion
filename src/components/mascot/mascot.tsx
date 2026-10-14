import { useRef } from "react";
import * as styles from "./mascot.css";
import { MASCOT_BASE_WIDTH } from "./mascot-physics";
import { type MascotMotion, useMascotPhysics } from "./use-mascot-physics";

type MascotProps = {
	// 体の幅（px）。舞台（動ける範囲）は、これに比例して大きくなる。
	size?: number;
	// tap（既定）：止まっていて、押すと1回だけ跳ねる／loop：跳ね続ける（読み込み中）／still：止まったまま。
	motion?: MascotMotion;
};

// アプリのマスコット（表示名は config/app.ts の MASCOT_DISPLAY_NAME）。
// 全部が動くと落ち着かないので、ふだんは止めておき、読み込み中（ボタンの処理中）だけ、跳ね続ける。
// 飾りなので、読み上げない（キーボードの操作も、なし）。
export function Mascot({
	size = MASCOT_BASE_WIDTH,
	motion = "tap",
}: MascotProps) {
	const bodyRef = useRef<HTMLSpanElement>(null);
	const scale = size / MASCOT_BASE_WIDTH;

	const hop = useMascotPhysics(bodyRef, { motion, scale });

	return (
		<span
			className={styles.stage}
			style={{ "--mascot-unit": `${scale}px` }}
			aria-hidden="true"
			onClick={motion === "tap" ? hop : undefined}
		>
			<span className={styles.body} ref={bodyRef} />
		</span>
	);
}
