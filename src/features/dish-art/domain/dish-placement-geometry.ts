import type { DishPlacement } from "./dish-cover";
import { dishArtViewSize } from "./dish-part";

export type Point = { x: number; y: number };

// 部品の中の（0〜100 の）範囲。
export type Bounds = { x: number; y: number; width: number; height: number };

const half = dishArtViewSize / 2;

function factors(placement: DishPlacement) {
	const scale = placement.scale ?? 1;
	const radians = ((placement.rotate ?? 0) * Math.PI) / 180;

	return {
		scaleX: placement.flip ? -scale : scale,
		scaleY: scale,
		cos: Math.cos(radians),
		sin: Math.sin(radians),
	};
}

// 部品の中の点を、絵の上の点に直す（DishArt の transform と同じ順）。
export function placementToCanvas(
	placement: DishPlacement,
	local: Point,
): Point {
	const { scaleX, scaleY, cos, sin } = factors(placement);
	const dx = (local.x - half) * scaleX;
	const dy = (local.y - half) * scaleY;

	return {
		x: placement.x + dx * cos - dy * sin,
		y: placement.y + dx * sin + dy * cos,
	};
}

// 絵の上の点を、部品の中の点に直す。
export function canvasToPlacement(
	placement: DishPlacement,
	point: Point,
): Point {
	const { scaleX, scaleY, cos, sin } = factors(placement);
	const dx = point.x - placement.x;
	const dy = point.y - placement.y;

	return {
		x: (dx * cos + dy * sin) / scaleX + half,
		y: (-dx * sin + dy * cos) / scaleY + half,
	};
}

// 範囲の四隅（左上・右上・右下・左下）を、絵の上の点で返す。
export function boundsCorners(
	placement: DishPlacement,
	bounds: Bounds,
): [Point, Point, Point, Point] {
	const right = bounds.x + bounds.width;
	const bottom = bounds.y + bounds.height;

	return [
		placementToCanvas(placement, { x: bounds.x, y: bounds.y }),
		placementToCanvas(placement, { x: right, y: bounds.y }),
		placementToCanvas(placement, { x: right, y: bottom }),
		placementToCanvas(placement, { x: bounds.x, y: bottom }),
	];
}

// 絵の上の点が、部品の範囲の中か（margin は、部品の中の単位での余裕）。
export function isInsideBounds(
	placement: DishPlacement,
	bounds: Bounds,
	point: Point,
	margin = 0,
): boolean {
	const local = canvasToPlacement(placement, point);

	return (
		local.x >= bounds.x - margin &&
		local.x <= bounds.x + bounds.width + margin &&
		local.y >= bounds.y - margin &&
		local.y <= bounds.y + bounds.height + margin
	);
}
