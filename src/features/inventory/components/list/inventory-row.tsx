import { Tag } from "#/components/tag/tag";
import { DishArt } from "#/features/dish-art/components/dish-art";
import {
	describeInventoryTile,
	describeTileQuantity,
} from "../../domain/describe-inventory-tile";
import { resolveIngredientArt } from "../../domain/ingredient-art";
import {
	type InventoryTile,
	inventoryZoneLabels,
} from "../../domain/inventory-fridge";
import * as styles from "./list.css";

type InventoryRowProps = {
	tile: InventoryTile;
	// 開いている食材。
	selected: boolean;
	// 追加した直後。
	highlighted?: boolean;
	// 場所の札を出すか（場所で絞っているときは、出さない）。
	showZone: boolean;
	onOpen: (tile: InventoryTile) => void;
};

// 一覧の1行：絵・名前・量・期限・（場所）。押すと、食材のパネルが開く。
export function InventoryRow({
	tile,
	selected,
	highlighted = false,
	showZone,
	onOpen,
}: InventoryRowProps) {
	const { expiry } = tile;

	return (
		<button
			className={styles.row}
			type="button"
			aria-label={describeInventoryTile(tile)}
			aria-haspopup="dialog"
			aria-expanded={selected}
			data-tile-key={tile.key}
			data-selected={selected}
			data-added={highlighted || undefined}
			data-empty={tile.isEmpty || undefined}
			data-expiry={expiry?.level}
			onClick={() => onOpen(tile)}
		>
			<span className={styles.art} aria-hidden>
				<DishArt
					placements={resolveIngredientArt(tile.ingredientName)}
					size={56}
				/>
			</span>
			<span className={styles.text} aria-hidden>
				<span className={styles.name}>{tile.name}</span>
				<span className={styles.meta}>
					<span className={styles.amount}>
						{tile.isEmpty ? "なし" : describeTileQuantity(tile)}
					</span>
					{tile.lotCount >= 2 ? (
						<span className={styles.amount}>（{tile.lotCount}回分）</span>
					) : null}
					{expiry ? (
						<Tag
							tone={expiry.level === "near" ? "warn" : "error"}
							icon={expiry.level === "expired" ? "alert-triangle" : "clock"}
							approximate={expiry.approximate}
						>
							{expiry.badgeText}
						</Tag>
					) : null}
					{showZone ? <Tag>{inventoryZoneLabels[tile.zone]}</Tag> : null}
				</span>
			</span>
		</button>
	);
}
