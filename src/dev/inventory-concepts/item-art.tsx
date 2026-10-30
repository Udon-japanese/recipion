import {
	DishArt,
	DishArtLayers,
} from "#/features/dish-art/components/dish-art";
import type { DishPlacement } from "#/features/dish-art/domain/dish-cover";
import { resolveIngredientArt } from "#/features/inventory/domain/ingredient-art";
import type { SampleItem } from "./sample-data";

export function itemPlacements(item: SampleItem): DishPlacement[] {
	return resolveIngredientArt(item.name, item.category);
}

// 食材の絵（本番と同じ、カタログの食材 ID の表から引く）。
export function ItemArt({ item, size }: { item: SampleItem; size: number }) {
	return <DishArt placements={itemPlacements(item)} size={size} />;
}

// 部屋の絵（svg）の中に、食材の絵を置く。
export function ItemArtAt({
	item,
	x,
	y,
	size,
}: {
	item: SampleItem;
	x: number;
	y: number;
	size: number;
}) {
	return (
		<svg
			x={x - size / 2}
			y={y - size}
			width={size}
			height={size}
			viewBox="0 0 100 100"
			aria-hidden="true"
		>
			<DishArtLayers placements={itemPlacements(item)} />
		</svg>
	);
}

// 庫内の棚に置く、部品そのもの。
export function PartAt({
	partId,
	x,
	y,
	size,
}: {
	partId: string;
	x: number;
	y: number;
	size: number;
}) {
	return (
		<svg
			x={x - size / 2}
			y={y - size}
			width={size}
			height={size}
			viewBox="0 0 100 100"
			aria-hidden="true"
		>
			<DishArtLayers placements={[{ partId, x: 50, y: 50, scale: 0.95 }]} />
		</svg>
	);
}
