import { type RefObject, useEffect, useState } from "react";

// scene.css.ts の camera と合わせる：絵の上の壁（操作の段の分）、下の床（右下の＋の分：＋の 56・場面の端との間 16・絵との間 16）。
const TOP_BAND = 64;
const FAB_ROOM = 56 + 16 + 16;
// 絵の高さの上限と下限（幅に対して）。
const MAX_ART_PER_WIDTH = 1.6;
const MIN_ART_PER_WIDTH = 1.3;

/** 絵の下に延ばした床の高さ（camera の高さ・上の位置と同じ計算）。 */
export function measureFloorRoom(width: number, height: number): number {
	const artHeight = Math.min(
		height,
		width * MAX_ART_PER_WIDTH,
		Math.max(width * MIN_ART_PER_WIDTH, height - TOP_BAND - FAB_ROOM),
	);
	const top = Math.min(TOP_BAND, Math.max(0, height - artHeight));

	return Math.max(0, height - top - artHeight);
}

/**
 * 場面（frame）の下に、＋を置けるだけの床があるか。
 * 縦に長いスマホでは、絵の下に床ができるので、＋をいつもの右下に置ける。足りなければ、絵の上の操作の段に置く。
 */
export function useFloorRoom(
	frameRef: RefObject<HTMLElement | null>,
	onChange?: (hasRoom: boolean) => void,
): boolean {
	const [hasRoom, setHasRoom] = useState(false);

	useEffect(() => {
		const frame = frameRef.current;

		if (!frame || typeof ResizeObserver === "undefined") {
			return;
		}

		const measure = () => {
			const rect = frame.getBoundingClientRect();

			setHasRoom(measureFloorRoom(rect.width, rect.height) >= FAB_ROOM);
		};
		const observer = new ResizeObserver(measure);

		measure();
		observer.observe(frame);

		return () => observer.disconnect();
	}, [frameRef]);

	useEffect(() => {
		onChange?.(hasRoom);
	}, [hasRoom, onChange]);

	return hasRoom;
}
