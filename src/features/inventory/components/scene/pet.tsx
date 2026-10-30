import { type CSSProperties, type RefObject, useId } from "react";
import * as petStyles from "./pet.css";

export type PetMood = "walk" | "idle" | "look" | "peek" | "sleep" | "cheer";

// れしぽよ。位置と跳ねは、場面（inventory-scene）の中で、useHopWalker が決める。
export function Pet({
	mood,
	onPoke,
	message,
	showMessage = false,
	onAttention,
	buttonRef,
	hopRef,
	isStatic = false,
	style,
}: {
	mood: PetMood;
	onPoke?: () => void;
	// ふきだしの言葉。見えていないときも、ボタンの説明として読み上げられる。
	message?: string;
	showMessage?: boolean;
	// マウスを乗せた・フォーカスした間は true。
	onAttention?: (attention: boolean) => void;
	buttonRef?: RefObject<HTMLButtonElement | null>;
	hopRef?: RefObject<HTMLSpanElement | null>;
	// 場面の外（庫内の縁）に、動かさずに置くとき。
	isStatic?: boolean;
	style?: CSSProperties;
}) {
	const messageId = useId();

	return (
		<button
			className={petStyles.pet}
			ref={buttonRef}
			type="button"
			data-mood={mood}
			data-static={isStatic}
			style={style}
			aria-label="れしぽよをつつく"
			aria-describedby={message ? messageId : undefined}
			onClick={onPoke}
			onPointerEnter={() => onAttention?.(true)}
			onPointerLeave={() => onAttention?.(false)}
			onFocus={() => onAttention?.(true)}
			onBlur={() => onAttention?.(false)}
		>
			{message ? (
				<>
					<span className={petStyles.srOnly} id={messageId}>
						{message}
					</span>
					<span
						className={petStyles.bubble}
						data-visible={showMessage}
						aria-hidden
					>
						{message}
					</span>
				</>
			) : null}
			<span className={petStyles.hopLayer} ref={hopRef}>
				<span className={petStyles.body} />
				{mood === "sleep" ? <span className={petStyles.zzz}>z</span> : null}
			</span>
		</button>
	);
}
