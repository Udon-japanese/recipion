import type { DishPlacement } from "../domain/dish-cover";
import { pickDishPlaceholder } from "../domain/dish-placeholder";
import { DishArt } from "./dish-art";

type DishCoverViewProps = {
	// null（絵を付けていない）は、れしぽよの絵を出す。
	cover: readonly DishPlacement[] | null | undefined;
	// 絵を付けていないときの、れしぽよの絵を決める種（レシピの識別子など）。
	seed: string;
	size: number;
};

// レシピの絵。付けた絵があればそれを、なければ、レシピごとに決まったれしぽよの絵を出す。
export function DishCoverView({ cover, seed, size }: DishCoverViewProps) {
	return (
		<DishArt
			placements={cover && cover.length > 0 ? cover : pickDishPlaceholder(seed)}
			size={size}
		/>
	);
}
