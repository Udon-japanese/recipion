import type { CSSProperties, RefObject } from "react";
import * as petStyles from "./pet.css";

export type PetMood = "walk" | "idle" | "look" | "peek" | "sleep" | "cheer";

// れしぽよ。位置と跳ねは、場面（inventory-scene）の中で、useHopWalker が決める。
export function Pet({
	mood,
	onPoke,
	buttonRef,
	hopRef,
	isStatic = false,
	style,
}: {
	mood: PetMood;
	onPoke?: () => void;
	buttonRef?: RefObject<HTMLButtonElement | null>;
	hopRef?: RefObject<HTMLSpanElement | null>;
	// 場面の外（庫内の縁）に、動かさずに置くとき。
	isStatic?: boolean;
	style?: CSSProperties;
}) {
	return (
		<button
			className={petStyles.pet}
			ref={buttonRef}
			type="button"
			data-mood={mood}
			data-static={isStatic}
			style={style}
			aria-label="れしぽよをつつく"
			onClick={onPoke}
		>
			<span className={petStyles.hopLayer} ref={hopRef}>
				<span className={petStyles.body} />
				{mood === "sleep" ? <span className={petStyles.zzz}>z</span> : null}
			</span>
		</button>
	);
}
