import { DishArtLayers } from "#/features/dish-art/components/dish-art";
import { resolveIngredientArt } from "../../domain/ingredient-art";
import type { InventoryTile } from "../../domain/inventory-fridge";

type Props = { x: number; y: number; size: number };

// 部屋の絵（svg）の中に、食材の絵を置く。
export function TileArtAt({
	tile,
	x,
	y,
	size,
}: Props & { tile: InventoryTile }) {
	return (
		<svg
			x={x - size / 2}
			y={y - size}
			width={size}
			height={size}
			viewBox="0 0 100 100"
			aria-hidden="true"
		>
			<DishArtLayers placements={resolveIngredientArt(tile.ingredientName)} />
		</svg>
	);
}

// 庫内の棚に置く、部品そのもの。
export function PartAt({ partId, x, y, size }: Props & { partId: string }) {
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
