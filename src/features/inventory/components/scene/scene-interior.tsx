import { useEffect, useRef } from "react";
import { IconButton } from "#/components/icon-button/icon-button";
import { useMediaQuery } from "#/components/use-media-query";
import {
	type InventoryFridgeZone,
	type InventoryTile,
	type InventoryZoneId,
	inventoryZoneLabels,
} from "../../domain/inventory-fridge";
import { srOnly } from "../inventory-list.css";
import { InventoryRow } from "../list/inventory-row";
import * as listStyles from "../list/list.css";
import { ZonePicker } from "../list/zone-picker";
import { ZoneTabs } from "../list/zone-tabs";
import { Pet } from "./pet";
import * as styles from "./scene.css";

type SceneInteriorProps = {
	zones: readonly InventoryFridgeZone[];
	zone: InventoryZoneId;
	night: boolean;
	petVisible: boolean;
	selectedItemId: string | null;
	highlightedItemIds?: ReadonlySet<string>;
	onZoneChange: (zone: InventoryZoneId) => void;
	onOpen: (tile: InventoryTile) => void;
	onBack: () => void;
};

// 庫内（ズームしたあと）：上に場所のタブ、下にその場所の食材の一覧。
export function SceneInterior({
	zones,
	zone,
	night,
	petVisible,
	selectedItemId,
	highlightedItemIds,
	onZoneChange,
	onOpen,
	onBack,
}: SceneInteriorProps) {
	const sectionRef = useRef<HTMLElement>(null);
	// スマホでは、タブが入りきらないので、見出しを押して、場所を選ぶ。
	const isCompact = useMediaQuery("(max-width: 767px)");
	const counts = Object.fromEntries(
		zones.map((item) => [item.id, item.tiles.length]),
	);
	const tiles = zones.find((item) => item.id === zone)?.tiles ?? [];

	const backButton = (
		<IconButton
			icon="chevron-left"
			label="おうちにもどる"
			size="std"
			onClick={onBack}
		/>
	);

	// 開いたら、キーボードの位置を庫内へ移す（閉じるときは、場面の側が元の場所へ戻す）。
	useEffect(() => {
		sectionRef.current?.focus();
	}, []);

	return (
		<div className={styles.interiorWrap}>
			<section
				ref={sectionRef}
				tabIndex={-1}
				className={styles.interior}
				aria-label={inventoryZoneLabels[zone]}
			>
				{petVisible ? (
					<Pet
						mood={night ? "sleep" : "peek"}
						isStatic
						style={{ left: "5cqh", top: "-6cqh" }}
					/>
				) : null}

				{isCompact ? (
					<h2 className={styles.interiorHead}>
						{backButton}
						<ZonePicker
							variant="heading"
							value={zone}
							counts={counts}
							onChange={(next) => {
								if (next) {
									onZoneChange(next);
								}
							}}
						/>
					</h2>
				) : (
					<div className={styles.interiorHead}>
						{backButton}
						{/* 見た目の見出しは、選んでいるタブが兼ねる。 */}
						<h2 className={srOnly}>{inventoryZoneLabels[zone]}</h2>
						<ZoneTabs
							value={zone}
							counts={counts}
							onChange={(next) => {
								if (next) {
									onZoneChange(next);
								}
							}}
						/>
					</div>
				)}

				<div className={styles.interiorScroll}>
					{tiles.length === 0 ? (
						<p className={listStyles.empty}>ここにはまだ何もありません。</p>
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
