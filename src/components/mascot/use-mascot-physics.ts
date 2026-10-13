import { type RefObject, useEffect } from "react";
import {
	createMascotPhysics,
	getMascotPose,
	getRestingMascotPose,
	type MascotPhysics,
	type MascotPose,
	stepMascotPhysics,
} from "./mascot-physics";

type Options = {
	// false のときは、静止した姿勢にする。
	active: boolean;
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
export function useMascotPhysics(
	ref: RefObject<HTMLElement | null>,
	{ active, scale }: Options,
) {
	useEffect(() => {
		const element = ref.current;
		if (!element) {
			return;
		}

		if (!active || prefersReducedMotion()) {
			applyPose(element, getRestingMascotPose(), scale);
			return;
		}

		const random = Math.random;
		const physics: MascotPhysics = createMascotPhysics(random);
		let frame = 0;
		let last = performance.now();

		applyPose(element, getMascotPose(physics), scale);

		function tick(now: number) {
			stepMascotPhysics(physics, now - last, random);
			last = now;

			if (element) {
				applyPose(element, getMascotPose(physics), scale);
			}
			frame = requestAnimationFrame(tick);
		}

		frame = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(frame);
		};
	}, [ref, active, scale]);
}
