import type { DishPart, DishShape } from "./dish-part";

// 部品を図形で描くための、短い書き方。座標は 0〜100 の正方形の中。
type Fill = DishShape["fill"];
type Options = { rotate?: number; opacity?: number };

export function circle(
	cx: number,
	cy: number,
	r: number,
	fill: Fill,
	opacity?: number,
): DishShape {
	return opacity === undefined
		? { kind: "circle", cx, cy, r, fill }
		: { kind: "circle", cx, cy, r, fill, opacity };
}

export function ellipse(
	cx: number,
	cy: number,
	rx: number,
	ry: number,
	fill: Fill,
	options: Options = {},
): DishShape {
	return { kind: "ellipse", cx, cy, rx, ry, fill, ...options };
}

export function rect(
	x: number,
	y: number,
	width: number,
	height: number,
	radius: number,
	fill: Fill,
	options: Options = {},
): DishShape {
	return { kind: "rect", x, y, width, height, radius, fill, ...options };
}

export function path(d: string, fill: Fill, opacity?: number): DishShape {
	return opacity === undefined
		? { kind: "path", d, fill }
		: { kind: "path", d, fill, opacity };
}

export function stroke(
	d: string,
	width: number,
	fill: Fill,
	opacity?: number,
): DishShape {
	return opacity === undefined
		? { kind: "stroke", d, width, fill }
		: { kind: "stroke", d, width, fill, opacity };
}

// つや（白い楕円）。
export function shine(
	cx: number,
	cy: number,
	rx = 7,
	ry = 3,
	rotate = -30,
	opacity = 0.4,
): DishShape {
	return ellipse(cx, cy, rx, ry, "white", { rotate, opacity });
}

// 影（黒の薄い重ね）。
export function shade(d: string, opacity = 0.12): DishShape {
	return path(d, "ink", opacity);
}

export function part(
	id: string,
	label: string,
	shapes: readonly DishShape[],
	tints: readonly string[] = [],
): DishPart {
	return { id, label, tints, shapes };
}

// 円弧（中心・半径・始まりと終わりの角度［度。右が0、時計回り］）。
export function arc(
	cx: number,
	cy: number,
	r: number,
	fromDeg: number,
	toDeg: number,
): string {
	const point = (deg: number) => {
		const rad = (deg * Math.PI) / 180;

		return `${(cx + r * Math.cos(rad)).toFixed(1)} ${(cy + r * Math.sin(rad)).toFixed(1)}`;
	};
	const large = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0;

	return `M${point(fromDeg)} A${r} ${r} 0 ${large} 1 ${point(toDeg)}`;
}

// 同じ形を、決まった位置に並べる（座標は固定。乱数は使わない）。
export function scatter<T>(
	spots: readonly (readonly [number, number, number?])[],
	draw: (x: number, y: number, turn: number) => T,
): T[] {
	return spots.map(([x, y, turn]) => draw(x, y, turn ?? 0));
}
