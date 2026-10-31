import * as v from "valibot";
import {
	type DishPlacement,
	dishPlacementSchema,
} from "#/features/dish-art/domain/dish-cover";

// アバター：料理の絵の部品を、丸い枠に並べたもの。部品は少なめ（小さく表示しても読めるように）。
export const avatarLimits = { maxParts: 8 } as const;

// 背景の色（id で保存する。色を変えても、保存した値は、そのまま使える）。
export const avatarBackgrounds = {
	yolk: "#fff3c4",
	butter: "#f9e2a0",
	cream: "#f7f4ec",
	peach: "#fde0d4",
	mint: "#dcefe0",
	sky: "#d9eaf5",
	lavender: "#e6e0f2",
	charcoal: "#4a4640",
} as const;

export type AvatarBackground = keyof typeof avatarBackgrounds;

const backgroundIds = Object.keys(avatarBackgrounds) as [
	AvatarBackground,
	...AvatarBackground[],
];

export const avatarSchema = v.object({
	background: v.picklist(backgroundIds),
	placements: v.pipe(
		v.array(dishPlacementSchema),
		v.minLength(1),
		v.maxLength(avatarLimits.maxParts),
	),
});

export type Avatar = {
	background: AvatarBackground;
	placements: readonly DishPlacement[];
};

// 保存されている値を読む。壊れていれば、なし（既定のアバター）にする。
export function parseAvatar(value: unknown): Avatar | null {
	const result = v.safeParse(avatarSchema, value);

	return result.success ? result.output : null;
}
