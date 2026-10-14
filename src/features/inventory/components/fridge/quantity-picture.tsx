import type { InventoryListItem } from "../../application/inventory-query-repository";
import { toGrains, toWaterLevel } from "../../domain/inventory-fridge";
import * as styles from "./fridge.css";

type QuantityPictureProps = {
	item: Pick<
		InventoryListItem,
		"quantity" | "capacity" | "stockUnitCode" | "trackingMode"
	>;
};

// 食材のパネルの量の絵（タイルと同じ：水位または粒）。絵にできない量のときは、何も出さない。
export function QuantityPicture({ item }: QuantityPictureProps) {
	if (item.trackingMode === "presence") {
		return null;
	}

	const approximate = item.trackingMode === "estimated";
	const level = toWaterLevel(item.quantity, item.capacity, item.stockUnitCode);
	const grains =
		item.stockUnitCode === "count" ? toGrains(item.quantity) : null;

	if (level !== null) {
		return (
			<span className={styles.picture} aria-hidden>
				<span className={styles.waterClip}>
					<span className={styles.water} style={{ "--level": level }}>
						<span
							className={styles.waterSurface}
							data-approximate={approximate}
						/>
					</span>
				</span>
			</span>
		);
	}

	if (grains) {
		return (
			<span className={styles.picture} aria-hidden>
				{Array.from({ length: grains.full }, (_, index) => (
					<span
						className={styles.pictureGrain}
						data-approximate={approximate}
						// biome-ignore lint/suspicious/noArrayIndexKey: 粒は同じ形が並ぶだけ
						key={index}
					/>
				))}
				{grains.partial > 0 ? (
					<span
						className={styles.pictureGrain}
						data-approximate={approximate}
						data-partial
						style={{ "--partial": `${Math.round(grains.partial * 100)}%` }}
					/>
				) : null}
			</span>
		);
	}

	return null;
}
