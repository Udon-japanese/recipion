import { useEffect, useRef } from "react";
import { IconButton } from "#/components/icon-button/icon-button";
import {
	type InventoryFridgeZone,
	type InventoryTile,
	type InventoryZoneId,
	inventoryZoneLabels,
} from "../../domain/inventory-fridge";
import { InventoryRow } from "../list/inventory-row";
import * as listStyles from "../list/list.css";
import { ZoneTabs } from "../list/zone-tabs";
import * as styles from "./scene.css";

type SceneInteriorProps = {
	zones: readonly InventoryFridgeZone[];
	zone: InventoryZoneId;
	selectedItemId: string | null;
	highlightedItemIds?: ReadonlySet<string>;
	onZoneChange: (zone: InventoryZoneId) => void;
	onOpen: (tile: InventoryTile) => void;
	onBack: () => void;
};

// 庫内（ズームしたあと）：左に場所の縦タブ、右にその場所の食材の一覧。
export function SceneInterior({
	zones,
	zone,
	selectedItemId,
	highlightedItemIds,
	onZoneChange,
	onOpen,
	onBack,
}: SceneInteriorProps) {
	const sectionRef = useRef<HTMLElement>(null);
	const tiles = zones.find((item) => item.id === zone)?.tiles ?? [];

	// 開いたら、キーボードの位置を庫内へ移す（閉じるときは、場面の側が元の場所へ戻す）。
	useEffect(() => {
		sectionRef.current?.focus();
	}, []);

	return (
		<div className={styles.interiorWrap}>
			<ZoneTabs
				value={zone}
				counts={Object.fromEntries(
					zones.map((item) => [item.id, item.tiles.length]),
				)}
				onChange={(next) => {
					if (next) {
						onZoneChange(next);
					}
				}}
			/>
			<section
				ref={sectionRef}
				tabIndex={-1}
				className={styles.interior}
				aria-label={inventoryZoneLabels[zone]}
			>
				<h2 className={styles.interiorHead}>
					<IconButton
						icon="chevron-left"
						label="おうちにもどる"
						size="std"
						onClick={onBack}
					/>
					{inventoryZoneLabels[zone]}
					<span className={styles.count}>（{tiles.length}）</span>
				</h2>

				<div className={styles.interiorScroll}>
					{tiles.length === 0 ? (
						<p className={listStyles.empty}>ここには、まだ何もありません。</p>
					) : (
						<ul className={listStyles.rows}>
							{tiles.map((tile) => (
								<li key={tile.key}>
									<InventoryRow
										tile={tile}
										selected={tile.inventoryItemId === selectedItemId}
										highlighted={highlightedItemIds?.has(tile.inventoryItemId)}
										showZone={false}
										onOpen={onOpen}
									/>
								</li>
							))}
						</ul>
					)}
				</div>
			</section>
		</div>
	);
}
