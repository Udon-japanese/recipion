import { type RefObject, useEffect, useRef } from "react";

// 場面の中の位置（%。x は幅、y は高さ。足元の位置）。
export type Point = { x: number; y: number };

// 場面の高さ ÷ 幅。縦と横を同じ長さで数えるために使う。
export const SCENE_ASPECT = 640 / 400;
// 1秒に進む距離（場面の幅に対する %）。
const SPEED = 22;
const HOP_SECONDS = 0.5;
const HOP_HEIGHT = 4.2;

type Options = {
	buttonRef: RefObject<HTMLElement | null>;
	hopRef: RefObject<HTMLElement | null>;
	target: Point;
	// false のあいだは止まる（ズーム中など）。
	active: boolean;
	start: Point;
	onArrive: () => void;
};

// 瞬間移動せず、跳ねながら、目的地までゆっくり歩く。
// 位置は button の left/top（%）、跳ねと潰れは hop 要素の CSS 変数に、毎フレーム直接書く（再描画は起こさない）。
export function useHopWalker({
	buttonRef,
	hopRef,
	target,
	active,
	start,
	onArrive,
}: Options) {
	const position = useRef<Point>(start);
	const phase = useRef(0);
	const arriveRef = useRef(onArrive);

	useEffect(() => {
		arriveRef.current = onArrive;
	});

	useEffect(() => {
		const button = buttonRef.current;
		const hop = hopRef.current;

		if (!button || !hop) {
			return;
		}

		const place = () => {
			button.style.left = `${position.current.x}%`;
			button.style.top = `${position.current.y}%`;
		};
		const rest = () => {
			hop.style.setProperty("--hop", "0");
			hop.style.setProperty("--sx", "1");
			hop.style.setProperty("--sy", "1");
			phase.current = 0;
		};

		place();

		if (!active) {
			return;
		}

		const reduced =
			typeof window.matchMedia === "function" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		let frame = 0;
		let last = performance.now();

		const tick = (now: number) => {
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;

			const dx = target.x - position.current.x;
			const dy = (target.y - position.current.y) * SCENE_ASPECT;
			const distance = Math.hypot(dx, dy);
			const step = SPEED * dt;

			if (reduced || distance <= step) {
				position.current = { x: target.x, y: target.y };
				place();
				rest();
				arriveRef.current();
				return;
			}

			position.current = {
				x: position.current.x + (dx / distance) * step,
				y: position.current.y + ((dy / distance) * step) / SCENE_ASPECT,
			};
			place();

			phase.current += dt / HOP_SECONDS;
			const lift = Math.abs(Math.sin(phase.current * Math.PI));
			hop.style.setProperty("--hop", (lift * HOP_HEIGHT).toFixed(2));
			// 着地でつぶれ、空中で伸びる。
			hop.style.setProperty("--sy", (0.86 + 0.22 * lift).toFixed(3));
			hop.style.setProperty("--sx", (1.1 - 0.14 * lift).toFixed(3));
			hop.style.setProperty("--face", `${dx >= 0 ? 1 : -1}`);

			frame = requestAnimationFrame(tick);
		};

		frame = requestAnimationFrame(tick);

		return () => {
			cancelAnimationFrame(frame);
			rest();
		};
	}, [buttonRef, hopRef, target, active]);
}
