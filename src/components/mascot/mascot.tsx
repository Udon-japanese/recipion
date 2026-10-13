import { useRef } from "react";
import * as styles from "./mascot.css";
import { MASCOT_BASE_WIDTH } from "./mascot-physics";
import { useMascotPhysics } from "./use-mascot-physics";

type MascotProps = {
	// 体の幅（px）。舞台（動ける範囲）は、これに比例して大きくなる。
	size?: number;
	// false にすると、静止する。
	active?: boolean;
};

// アプリのマスコット（表示名は config/app.ts の MASCOT_DISPLAY_NAME）。
// 舞台の中を、跳ねたり、まばたきしたりする。飾りなので、読み上げない。
export function Mascot({
	size = MASCOT_BASE_WIDTH,
	active = true,
}: MascotProps) {
	const bodyRef = useRef<HTMLSpanElement>(null);
	const scale = size / MASCOT_BASE_WIDTH;

	useMascotPhysics(bodyRef, { active, scale });

	return (
		<span
			className={styles.stage}
			style={{ "--mascot-unit": `${scale}px` }}
			aria-hidden="true"
		>
			<span className={styles.body} ref={bodyRef} />
		</span>
	);
}
