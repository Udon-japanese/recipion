import { useEffect, useMemo, useState } from "react";
import { Card } from "#/components/card/card";
import { Chip, ChipGroup } from "#/components/chip/chip";
import { TextInput } from "#/components/field/field";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import type {
	InventoryFridgeZone,
	InventoryTile,
	InventoryZoneId,
} from "../../domain/inventory-fridge";
import {
	compareTilesFor,
	type InventoryGroupBy,
	inventoryGroupByOptions,
	inventoryGroupOf,
	listInventoryGroups,
} from "../../domain/inventory-grouping";
import { InventoryRow } from "./inventory-row";
import * as styles from "./list.css";
import { ZoneTabs } from "./zone-tabs";

const storageKey = "recipion.inventory.groupBy";

function readGroupBy(): InventoryGroupBy {
	try {
		const value = window.localStorage.getItem(storageKey);

		return inventoryGroupByOptions.some((option) => option.value === value)
			? (value as InventoryGroupBy)
			: "zone";
	} catch {
		return "zone";
	}
}

type InventoryListViewProps = {
	zones: readonly InventoryFridgeZone[];
	today: string;
	selectedItemId: string | null;
	// 追加した直後の食材。
	highlightedItemIds?: ReadonlySet<string>;
	onOpen: (tile: InventoryTile) => void;
};

// 在庫の一覧：検索と、「場所・期限・あいうえお」のまとめ方。場所は縦タブ、ほかは横のチップで、一瞬で切り替える。
export function InventoryListView({
	zones,
	today,
	selectedItemId,
	highlightedItemIds,
	onOpen,
}: InventoryListViewProps) {
	const [query, setQuery] = useState("");
	const [by, setBy] = useState<InventoryGroupBy>("zone");
	const [pick, setPick] = useState<string | null>(null);

	// 最後に選んだまとめ方を覚える（読み込めなければ、場所）。
	useEffect(() => {
		setBy(readGroupBy());
	}, []);

	const searched = useMemo(() => {
		const text = query.trim();

		return zones
			.flatMap((zone) => zone.tiles)
			.filter(
				(tile) =>
					tile.name.includes(text) || tile.ingredientName.includes(text),
			);
	}, [zones, query]);

	const counts = useMemo(() => {
		const result = new Map<string, number>();

		for (const tile of searched) {
			const id = inventoryGroupOf(tile, by, today);

			result.set(id, (result.get(id) ?? 0) + 1);
		}

		return result;
	}, [searched, by, today]);

	const groups = listInventoryGroups(by).filter(
		(group) => (counts.get(group.id) ?? 0) > 0,
	);
	const active = pick !== null && counts.has(pick) ? pick : null;

	const shown = useMemo(() => {
		const tiles =
			active === null
				? searched
				: searched.filter(
						(tile) => inventoryGroupOf(tile, by, today) === active,
					);

		// 場所は、画面を開いたときに決めた並びのまま。ほかは、まとめ方の並び。
		return by === "zone" ? tiles : [...tiles].sort(compareTilesFor(by));
	}, [searched, active, by, today]);

	function changeBy(value: InventoryGroupBy) {
		setBy(value);
		setPick(null);

		try {
			window.localStorage.setItem(storageKey, value);
		} catch {
			// 覚えられなくても、そのまま使える。
		}
	}

	return (
		<div className={styles.wrap}>
			<TextInput
				type="search"
				placeholder="在庫を探す"
				aria-label="在庫を探す"
				value={query}
				onChange={(event) => setQuery(event.target.value)}
			/>

			<SegmentedControl
				label="まとめ方"
				value={by}
				onChange={changeBy}
				options={inventoryGroupByOptions}
			/>

			<div className={styles.body}>
				{by === "zone" ? (
					<ZoneTabs
						value={active as InventoryZoneId | null}
						counts={Object.fromEntries(counts)}
						onChange={setPick}
					/>
				) : null}

				<div className={styles.main}>
					{by === "zone" ? null : (
						<div className={styles.chipScroll}>
							<ChipGroup label="絞り込み">
								<Chip pressed={active === null} onClick={() => setPick(null)}>
									すべて {searched.length}
								</Chip>
								{groups.map((group) => (
									<Chip
										key={group.id}
										pressed={group.id === active}
										onClick={() => setPick(group.id)}
									>
										{group.label} {counts.get(group.id)}
									</Chip>
								))}
							</ChipGroup>
						</div>
					)}

					<Card>
						{shown.length === 0 ? (
							<p className={styles.empty}>見つかりませんでした。</p>
						) : (
							<ul className={styles.rows}>
								{shown.map((tile) => (
									<li key={tile.key}>
										<InventoryRow
											tile={tile}
											selected={tile.inventoryItemId === selectedItemId}
											highlighted={highlightedItemIds?.has(
												tile.inventoryItemId,
											)}
											showZone={!(by === "zone" && active !== null)}
											onOpen={onOpen}
										/>
									</li>
								))}
							</ul>
						)}
					</Card>
				</div>
			</div>
		</div>
	);
}
