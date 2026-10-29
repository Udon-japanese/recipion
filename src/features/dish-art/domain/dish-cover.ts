import * as v from "valibot";
import { dishArtViewSize, findDishPart } from "./dish-part";

// 料理の絵の上限（1か所にまとめる）。保存の容量と、描画の重さを守る。
export const dishCoverLimits = {
	maxParts: 30,
	minScale: 0.1,
	maxScale: 3,
	maxRotate: 180,
} as const;

const coordinate = v.pipe(
	v.number(),
	v.minValue(0),
	v.maxValue(dishArtViewSize),
);

// 置いた部品。x・y は部品の中心（0〜100）、scale は 1 が等倍。
const dishPlacementSchema = v.object({
	partId: v.pipe(
		v.string(),
		v.check((id) => findDishPart(id) !== undefined, "知らない部品です。"),
	),
	x: coordinate,
	y: coordinate,
	scale: v.optional(
		v.pipe(
			v.number(),
			v.minValue(dishCoverLimits.minScale),
			v.maxValue(dishCoverLimits.maxScale),
		),
	),
	rotate: v.optional(
		v.pipe(
			v.number(),
			v.minValue(-dishCoverLimits.maxRotate),
			v.maxValue(dishCoverLimits.maxRotate),
		),
	),
	flip: v.optional(v.boolean()),
	tint: v.optional(v.pipe(v.string(), v.regex(/^#[0-9a-f]{6}$/i))),
});

export type DishPlacement = v.InferOutput<typeof dishPlacementSchema>;

// 保存されている値を読む。壊れていれば、なし（プリセットの表示）にする。
export function parseDishCover(value: unknown): DishPlacement[] | null {
	const result = v.safeParse(dishPlacementsSchema, value);

	return result.success ? result.output : null;
}

// 並びの順が重なり順（あとの部品が手前）。
export const dishPlacementsSchema = v.pipe(
	v.array(dishPlacementSchema),
	// 空の絵は保存しない（絵がないときは null で、レシピ名から選ぶ絵になる）。
	v.minLength(1),
	v.maxLength(dishCoverLimits.maxParts),
);
