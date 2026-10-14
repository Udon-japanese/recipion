import { type RefObject, useCallback, useEffect, useRef } from "react";
import {
	createMascotPhysics,
	getMascotPose,
	getRestingMascotPose,
	isMascotAtRest,
	type MascotPhysics,
	type MascotPose,
	startMascotHop,
	stepMascotPhysics,
} from "./mascot-physics";

// loop：自分で跳ね続ける（読み込み中）。tap：止まっていて、押すと1回だけ跳ねる。still：止まったまま。
export type MascotMotion = "loop" | "tap" | "still";

type Options = {
	motion: MascotMotion;
	// 基準の大きさに対する、表示の倍率。
	scale: number;
};

function applyPose(element: HTMLElement, pose: MascotPose, scale: number) {
	element.style.transform =
		`translate(${(pose.x * scale).toFixed(2)}px, ${(pose.y * scale).toFixed(2)}px) ` +
		`rotate(${pose.rotate.toFixed(2)}deg) ` +
		`skewX(${pose.skewX.toFixed(2)}deg) ` +
		`scale(${pose.scaleX.toFixed(3)}, ${pose.scaleY.toFixed(3)})`;
	element.style.borderRadius = pose.borderRadius;
	element.style.setProperty(
		"--eye-x",
		`${(pose.eyeOffset * scale).toFixed(2)}px`,
	);
	element.style.setProperty("--eye-scale-y", pose.eyeScaleY.toFixed(3));
}

function prefersReducedMotion() {
	return (
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

// 毎フレーム、要素のスタイルを直接書き換える（画面の再描画は起こさない）。
// 返す関数は、tap のときに、跳ねさせる（それ以外では、何もしない）。
export function useMascotPhysics(
	ref: RefObject<HTMLElement | null>,
	{ motion, scale }: Options,
): () => void {
	const hopRef = useRef<() => void>(() => {});

	useEffect(() => {
		const element = ref.current;
		hopRef.current = () => {};

		if (!element) {
			return;
		}

		if (motion === "still" || prefersReducedMotion()) {
			applyPose(element, getRestingMascotPose(), scale);
			return;
		}

		const random = Math.random;
		const physics: MascotPhysics = createMascotPhysics(
			random,
			motion === "loop",
		);
		let frame = 0;
		let last = performance.now();

		applyPose(element, getMascotPose(physics), scale);

		function tick(now: number) {
			stepMascotPhysics(physics, now - last, random);
			last = now;

			if (element) {
				applyPose(element, getMascotPose(physics), scale);
			}

			// 1回だけ跳ねるときは、収まったら、計算を止める。
			if (motion === "tap" && isMascotAtRest(physics)) {
				frame = 0;
				return;
			}

			frame = requestAnimationFrame(tick);
		}

		function start() {
			last = performance.now();
			frame = requestAnimationFrame(tick);
		}

		if (motion === "loop") {
			start();
		} else {
			hopRef.current = () => {
				if (startMascotHop(physics) && frame === 0) {
					start();
				}
			};
		}

		return () => {
			cancelAnimationFrame(frame);
			hopRef.current = () => {};
		};
	}, [ref, motion, scale]);

	return useCallback(() => hopRef.current(), []);
}
