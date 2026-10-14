import { Icon } from "#/components/icon/icon";
import {
	describeInventoryTile,
	describeTileQuantity,
} from "../../domain/describe-inventory-tile";
import type { InventoryTile as InventoryTileModel } from "../../domain/inventory-fridge";
import * as styles from "./fridge.css";

type InventoryTileProps = {
	tile: InventoryTileModel;
	// 開いている食材。
	selected: boolean;
	// ゾーンの中の移動（ロービング）。フォーカスを受けるタイルだけ 0。
	tabIndex: 0 | -1;
	onOpen: (tile: InventoryTileModel) => void;
	onFocus: (tile: InventoryTileModel) => void;
};

const waterTicks = [0.25, 0.5, 0.75];

function Grains({ tile }: { tile: InventoryTileModel }) {
	if (!tile.grains) {
		return null;
	}

	const { full, partial } = tile.grains;

	return (
		<span className={styles.grains} aria-hidden>
			{Array.from({ length: full }, (_, index) => (
				<span
					className={styles.grain}
					data-approximate={tile.approximate}
					// biome-ignore lint/suspicious/noArrayIndexKey: 粒は同じ形が並ぶだけ
					key={index}
				/>
			))}
			{partial > 0 ? (
				<span
					className={styles.grain}
					data-approximate={tile.approximate}
					data-partial
					style={{ "--partial": `${Math.round(partial * 100)}%` }}
				/>
			) : null}
		</span>
	);
}

// 冷蔵庫の中の、食材の容器（タイル）。押すと、食材のパネルが開く。
export function InventoryTile({
	tile,
	selected,
	tabIndex,
	onOpen,
	onFocus,
}: InventoryTileProps) {
	const isPocket = tile.zone === "door";
	const { expiry } = tile;

	return (
		<li className={styles.tileItem}>
			<button
				className={isPocket ? styles.pocket : styles.tile}
				type="button"
				tabIndex={tabIndex}
				aria-label={describeInventoryTile(tile)}
				aria-haspopup="dialog"
				aria-expanded={selected}
				data-tile-key={tile.key}
				data-selected={selected}
				data-expiry={expiry?.level}
				data-lots={tile.lotCount >= 2 ? 2 : undefined}
				data-empty={tile.isEmpty || undefined}
				onClick={() => onOpen(tile)}
				onFocus={() => onFocus(tile)}
			>
				{tile.level !== null ? (
					<span className={styles.waterClip} aria-hidden>
						<span className={styles.water} style={{ "--level": tile.level }}>
							<span
								className={styles.waterSurface}
								data-approximate={tile.approximate}
							/>
						</span>
						{waterTicks.map((tick) => (
							<span
								className={styles.waterTick}
								key={tick}
								style={{ "--tick": tick }}
							/>
						))}
					</span>
				) : null}

				<span className={styles.name} aria-hidden>
					{tile.name}
				</span>

				{isPocket ? (
					<span
						className={styles.presenceTag}
						data-present={tile.isPresent}
						aria-hidden
					>
						<Icon name={tile.isPresent ? "check" : "close"} size={16} />
						{tile.isPresent ? "あり" : "なし"}
					</span>
				) : (
					<>
						<Grains tile={tile} />
						<span className={styles.amount} aria-hidden>
							{describeTileQuantity(tile)}
						</span>
					</>
				)}

				{expiry ? (
					<span
						className={styles.expiryBadge}
						data-level={expiry.level}
						data-approximate={expiry.approximate || undefined}
						aria-hidden
					>
						<Icon
							name={expiry.level === "expired" ? "alert-triangle" : "clock"}
							size={16}
						/>
						{expiry.badgeText}
					</span>
				) : null}

				{tile.lotCount >= 2 ? (
					<span className={styles.lotCount} aria-hidden>
						×{tile.lotCount}
					</span>
				) : null}
			</button>
		</li>
	);
}
