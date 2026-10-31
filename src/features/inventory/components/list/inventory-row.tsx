import { Tag } from "#/components/tag/tag";
import { DishArt } from "#/features/dish-art/components/dish-art";
import {
	describeInventoryTile,
	tileQuantityParts,
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

// 一覧の1行：絵・名前・（期限の近いものだけ札）・量（右に大きく）。押すと、食材のパネルが開く。
export function InventoryRow({
	tile,
	selected,
	highlighted = false,
	showZone,
	onOpen,
}: InventoryRowProps) {
	const { expiry } = tile;
	const quantity = tileQuantityParts(tile);

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
					size={48}
				/>
			</span>
			<span className={styles.text} aria-hidden>
				<span className={styles.name}>{tile.name}</span>
				{expiry || showZone ? (
					<span className={styles.meta}>
						{expiry ? (
							<Tag
								tone={expiry.level === "near" ? "warn" : "error"}
								icon={expiry.level === "expired" ? "alert-triangle" : "clock"}
								approximate={expiry.approximate}
							>
								{expiry.badgeText}
							</Tag>
						) : null}
						{showZone ? (
							<span className={styles.zone}>
								{inventoryZoneLabels[tile.zone]}
							</span>
						) : null}
					</span>
				) : null}
			</span>
			<span className={styles.quantity} aria-hidden>
				{tile.isEmpty ? (
					<span className={styles.none}>なし</span>
				) : quantity ? (
					<>
						{quantity.approximate ? (
							<span className={styles.unit}>約</span>
						) : null}
						<span className={styles.amount}>{quantity.amount}</span>
						<span className={styles.unit}>{quantity.unit}</span>
					</>
				) : (
					<Tag tone={tile.isPresent ? "success" : "default"}>
						{tile.isPresent ? "あり" : "なし"}
					</Tag>
				)}
			</span>
		</button>
	);
}
