import {
	type CSSProperties,
	type RefObject,
	useEffect,
	useId,
	useRef,
} from "react";
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
	boundsRef,
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
	// ふきだしを、この枠（おうちの範囲）の中に収める。省略すると、頭の上にそのまま出す。
	boundsRef?: RefObject<HTMLElement | null>;
	style?: CSSProperties;
}) {
	const messageId = useId();
	const bubbleRef = useRef<HTMLSpanElement>(null);

	// ふきだしが見えているあいだ、枠からはみ出さないよう、横にずらし、上に余裕がなければ、下に出す。
	// れしぽよは歩くので、毎フレーム測る（見えていないときは、測らない）。
	useEffect(() => {
		const bubble = bubbleRef.current;

		if (!showMessage || !bubble) {
			return;
		}

		let frame = 0;

		const update = () => {
			const bounds = boundsRef?.current;
			const pet = bubble.parentElement;

			if (bounds && pet) {
				const boundsRect = bounds.getBoundingClientRect();
				const petRect = pet.getBoundingClientRect();
				const rect = bubble.getBoundingClientRect();
				const margin = 8;
				// ふきだしは、れしぴょんの真上に中央をそろえて置く。いまのずれ（動いている途中）に左右されないよう、
				// れしぽよの中心と、ふきだしの幅から、もとの左右の位置を出す。
				const center = petRect.left + petRect.width / 2;
				const left = center - rect.width / 2;
				const right = center + rect.width / 2;
				let next = 0;

				if (left < boundsRect.left + margin) {
					next = boundsRect.left + margin - left;
				} else if (right > boundsRect.right - margin) {
					next = boundsRect.right - margin - right;
				}

				const gap = boundsRect.height * 0.042;
				const needed = bubble.offsetHeight + gap + margin;

				bubble.style.setProperty("--bubble-shift", `${next}px`);
				bubble.dataset.placement =
					petRect.top - boundsRect.top < needed ? "below" : "above";
			}

			frame = requestAnimationFrame(update);
		};

		frame = requestAnimationFrame(update);

		return () => cancelAnimationFrame(frame);
	}, [showMessage, boundsRef]);

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
						ref={bubbleRef}
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
