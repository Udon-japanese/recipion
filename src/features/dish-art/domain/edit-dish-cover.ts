import { type DishPlacement, dishCoverLimits } from "./dish-cover";
import { dishArtViewSize, findDishPart } from "./dish-part";
import { type Bounds, isInsideBounds } from "./dish-placement-geometry";

const center = dishArtViewSize / 2;
// 新しく置く部品の大きさ。
const defaultScale = 0.5;
const scaleStep = 1.15;
const rotateStep = 15;
const nudgeStep = 2;

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function replaceAt(
	placements: readonly DishPlacement[],
	index: number,
	change: (placement: DishPlacement) => DishPlacement,
): DishPlacement[] {
	return placements.map((placement, at) =>
		at === index ? change(placement) : placement,
	);
}

// 部品を、手前（最後）に足す。上限を超えるときは、なにもしない。
export function addDishPart(
	placements: readonly DishPlacement[],
	partId: string,
): DishPlacement[] {
	if (
		placements.length >= dishCoverLimits.maxParts ||
		findDishPart(partId) === undefined
	) {
		return [...placements];
	}

	return [...placements, { partId, x: center, y: center, scale: defaultScale }];
}

export function removeDishPart(
	placements: readonly DishPlacement[],
	index: number,
): DishPlacement[] {
	return placements.filter((_, at) => at !== index);
}

export function moveDishPart(
	placements: readonly DishPlacement[],
	index: number,
	x: number,
	y: number,
): DishPlacement[] {
	return replaceAt(placements, index, (placement) => ({
		...placement,
		x: clamp(x, 0, dishArtViewSize),
		y: clamp(y, 0, dishArtViewSize),
	}));
}

export function nudgeDishPart(
	placements: readonly DishPlacement[],
	index: number,
	dx: -1 | 0 | 1,
	dy: -1 | 0 | 1,
): DishPlacement[] {
	const target = placements[index];

	return target
		? moveDishPart(
				placements,
				index,
				target.x + dx * nudgeStep,
				target.y + dy * nudgeStep,
			)
		: [...placements];
}

export function scaleDishPart(
	placements: readonly DishPlacement[],
	index: number,
	direction: 1 | -1,
): DishPlacement[] {
	return replaceAt(placements, index, (placement) => ({
		...placement,
		scale: clamp(
			(placement.scale ?? 1) * (direction === 1 ? scaleStep : 1 / scaleStep),
			dishCoverLimits.minScale,
			dishCoverLimits.maxScale,
		),
	}));
}

export function rotateDishPart(
	placements: readonly DishPlacement[],
	index: number,
	direction: 1 | -1,
): DishPlacement[] {
	return replaceAt(placements, index, (placement) => {
		let rotate = (placement.rotate ?? 0) + direction * rotateStep;

		// -180〜180 の範囲に収める。
		if (rotate > dishCoverLimits.maxRotate) rotate -= 360;
		if (rotate < -dishCoverLimits.maxRotate) rotate += 360;

		return { ...placement, rotate };
	});
}

// 大きさを指定する（つまむ・角をひく操作用）。
export function setDishPartScale(
	placements: readonly DishPlacement[],
	index: number,
	scale: number,
): DishPlacement[] {
	return replaceAt(placements, index, (placement) => ({
		...placement,
		scale: clamp(scale, dishCoverLimits.minScale, dishCoverLimits.maxScale),
	}));
}

// 向きを指定する（度。-180〜180 に収める）。
export function setDishPartRotate(
	placements: readonly DishPlacement[],
	index: number,
	degrees: number,
): DishPlacement[] {
	const wrapped = ((((degrees + 180) % 360) + 360) % 360) - 180;

	return replaceAt(placements, index, (placement) => ({
		...placement,
		rotate: wrapped,
	}));
}

// 向きを、いまの向きから、決まった角度だけ回す（90度ずつなど）。
export function turnDishPart(
	placements: readonly DishPlacement[],
	index: number,
	degrees: number,
): DishPlacement[] {
	const target = placements[index];

	return target
		? setDishPartRotate(placements, index, (target.rotate ?? 0) + degrees)
		: [...placements];
}

// 90度の倍数に近いときは、ぴたりと合わせる（つまみで回すとき）。
export function snapRotation(degrees: number, tolerance = 5): number {
	const nearest = Math.round(degrees / 90) * 90;

	return Math.abs(degrees - nearest) <= tolerance ? nearest : degrees;
}

// 同じ部品を、少しずらして手前に足す。上限を超えるときは、なにもしない。
export function duplicateDishPart(
	placements: readonly DishPlacement[],
	index: number,
): DishPlacement[] {
	const target = placements[index];

	if (!target || placements.length >= dishCoverLimits.maxParts) {
		return [...placements];
	}

	return [
		...placements,
		{
			...target,
			x: clamp(target.x + 6, 0, dishArtViewSize),
			y: clamp(target.y + 6, 0, dishArtViewSize),
		},
	];
}

export function flipDishPart(
	placements: readonly DishPlacement[],
	index: number,
): DishPlacement[] {
	return replaceAt(placements, index, (placement) => ({
		...placement,
		flip: !placement.flip,
	}));
}

export function tintDishPart(
	placements: readonly DishPlacement[],
	index: number,
	tint: string,
): DishPlacement[] {
	return replaceAt(placements, index, (placement) => ({
		...placement,
		tint,
	}));
}

// 重なり順を1つ動かす。動かしたあとの番号は、reorder の結果の `selected` で返す。
export function reorderDishPart(
	placements: readonly DishPlacement[],
	index: number,
	direction: 1 | -1,
): { placements: DishPlacement[]; selected: number } {
	const next = index + direction;
	const target = placements[index];
	const other = placements[next];

	if (!target || !other) {
		return { placements: [...placements], selected: index };
	}

	const result = [...placements];

	result[index] = other;
	result[next] = target;

	return { placements: result, selected: next };
}

// 触れた点にいちばん手前で重なっている部品の番号（なければ -1）。
// 部品の範囲が分かるときは、その範囲で。分からないときは、等倍で約 60 を目安にした円で近似する。
export function findDishPartAt(
	placements: readonly DishPlacement[],
	x: number,
	y: number,
	boundsOf?: (partId: string) => Bounds | undefined,
): number {
	for (let index = placements.length - 1; index >= 0; index -= 1) {
		const placement = placements[index];

		if (!placement) continue;

		const bounds = boundsOf?.(placement.partId);

		if (bounds) {
			if (isInsideBounds(placement, bounds, { x, y }, 3)) return index;

			continue;
		}

		const radius = Math.max(8, 30 * (placement.scale ?? 1));

		if (Math.hypot(placement.x - x, placement.y - y) <= radius) {
			return index;
		}
	}

	return -1;
}
