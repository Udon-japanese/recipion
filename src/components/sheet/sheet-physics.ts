// ボトムシートの動きの計算（画面に依存しない純粋な関数）。
// 位置は「見えている高さ（visible）」のピクセルで表す（0 ＝ 閉じている、大きいほど、高く開いている）。
// 速さの単位は px/ms。下向きが正。

// この速さ以上の動きは、「はじいた」（フリック）とみなす。
export const FLICK_VELOCITY = 0.4;
// この速さ以上の、勢いのよい下向きのはじきは、どの位置からでも、閉じる。
export const DISMISS_VELOCITY = 1;
// 最も低い止まり位置から、この割合より多く下げて離すと、閉じる。
export const CLOSE_THRESHOLD = 0.25;
// 離したあと、勢いが続くとみなす時間。
export const PROJECTION_MS = 120;
// 速さを見積もる、直近の時間。
export const VELOCITY_WINDOW_MS = 100;
// 上限を超えて引いたときの、ゴムの強さ（大きいほど、遠くまで伸びる）。
const RUBBER_BAND_LIMIT = 120;
const RUBBER_BAND_COEFFICIENT = 0.55;

export type Sample = { y: number; t: number };

export type ReleaseDecision =
	| { type: "snap"; index: number }
	| { type: "dismiss" };

// 上限（または下限）を超えて引いた量 offset を、ゴムのように縮めた量にする。
export function rubberBand(offset: number): number {
	if (offset <= 0) {
		return 0;
	}

	return (
		(1 - 1 / ((offset * RUBBER_BAND_COEFFICIENT) / RUBBER_BAND_LIMIT + 1)) *
		RUBBER_BAND_LIMIT
	);
}

// 指の位置（生の見える高さ）から、実際に描く見える高さを決める。
// 最も高い止まり位置を超えると、ゴムのように重くなる。閉じられないシートは、最も低い位置の下でも重くなる。
export function displayVisible(
	rawVisible: number,
	snaps: readonly number[],
	dismissible: boolean,
): number {
	const lowest = snaps[0] ?? 0;
	const highest = snaps[snaps.length - 1] ?? 0;

	if (rawVisible > highest) {
		return highest + rubberBand(rawVisible - highest);
	}

	if (!dismissible && rawVisible < lowest) {
		return lowest - rubberBand(lowest - rawVisible);
	}

	return Math.max(0, rawVisible);
}

// 直近の動きから、速さ（px/ms。下向きが正）を見積もる。
export function estimateVelocity(
	samples: readonly Sample[],
	now: number,
): number {
	const recent = samples.filter(
		(sample) => now - sample.t <= VELOCITY_WINDOW_MS,
	);
	const first = recent[0];
	const last = recent[recent.length - 1];

	if (!first || !last || last.t === first.t) {
		return 0;
	}

	return (last.y - first.y) / (last.t - first.t);
}

// 指を離したときの行き先を決める。snaps は、見える高さの昇順。
export function resolveRelease(input: {
	visible: number;
	velocity: number;
	snaps: readonly number[];
	dismissible: boolean;
}): ReleaseDecision {
	const { visible, velocity, snaps, dismissible } = input;
	const lowest = snaps[0] ?? 0;
	const lastIndex = snaps.length - 1;

	// 0. 勢いよく下へはじいた：どの位置からでも、閉じる（閉じられないシートは、最も低い位置へ）。
	if (velocity >= DISMISS_VELOCITY) {
		return dismissible ? { type: "dismiss" } : { type: "snap", index: 0 };
	}

	// 1. はじいた：方向で、次の止まり位置（または閉じる）へ。
	if (Math.abs(velocity) >= FLICK_VELOCITY) {
		if (velocity > 0) {
			let lower = -1;

			for (let index = 0; index <= lastIndex; index++) {
				if ((snaps[index] ?? 0) < visible - 1) {
					lower = index;
				}
			}

			if (lower >= 0) {
				return { type: "snap", index: lower };
			}

			return dismissible ? { type: "dismiss" } : { type: "snap", index: 0 };
		}

		const higher = snaps.findIndex((snap) => snap > visible + 1);

		return { type: "snap", index: higher >= 0 ? higher : lastIndex };
	}

	// 2. ゆっくり：最も低い位置から、大きく下げていれば、閉じる。
	if (dismissible && visible < lowest * (1 - CLOSE_THRESHOLD)) {
		return { type: "dismiss" };
	}

	// 3. 勢いの続きを見て、いちばん近い止まり位置へ。
	const projected = visible - velocity * PROJECTION_MS;
	let nearest = 0;

	for (let index = 1; index <= lastIndex; index++) {
		if (
			Math.abs((snaps[index] ?? 0) - projected) <
			Math.abs((snaps[nearest] ?? 0) - projected)
		) {
			nearest = index;
		}
	}

	return { type: "snap", index: nearest };
}

// 暗幕の濃さ（0〜1）。最も低い止まり位置で 1、閉じるほど薄くなる。
export function backdropProgress(visible: number, lowestSnap: number): number {
	if (lowestSnap <= 0) {
		return 0;
	}

	return Math.min(1, Math.max(0, visible / lowestSnap));
}

// 画面の高さの割合（昇順）から、見える高さ（px）にする。
export function snapsToVisible(
	fractions: readonly number[],
	viewportHeight: number,
): number[] {
	return [...fractions]
		.sort((a, b) => a - b)
		.map((fraction) => Math.round(fraction * viewportHeight));
}
