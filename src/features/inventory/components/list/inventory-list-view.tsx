import { useId, useMemo } from "react";
import { SelectBox, TextInput } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import { DishArt } from "#/features/dish-art/components/dish-art";
import { resolveIngredientArt } from "../../domain/ingredient-art";
import {
	type InventoryFridgeZone,
	type InventoryTile,
	type InventoryTileExpiry,
	type InventoryZoneId,
	inventoryZones,
} from "../../domain/inventory-fridge";
import {
	compareTilesFor,
	type InventoryGroupBy,
	inventoryGroupByOptions,
	inventoryGroupOf,
	listInventoryGroups,
	pickUseSoonTiles,
} from "../../domain/inventory-grouping";
import { InventoryRow } from "./inventory-row";
import * as styles from "./list.css";
import { zoneIcons } from "./zone-tabs";

type InventoryListViewProps = {
	zones: readonly InventoryFridgeZone[];
	today: string;
	selectedItemId: string | null;
	// 追加した直後の食材。
	highlightedItemIds?: ReadonlySet<string>;
	// 検索の言葉と、まとめ方（上の操作の段で選ぶ。InventorySearch）。
	query: string;
	by: InventoryGroupBy;
	onOpen: (tile: InventoryTile) => void;
};

function isZoneId(id: string): id is InventoryZoneId {
	return inventoryZones.some((zone) => zone.id === id);
}

// 「早めに使う」のカードの、大きく出す期限（「今日まで」「あと3日」「切れ」）。
function describeUseSoon(expiry: InventoryTileExpiry): {
	before?: string;
	main: string;
	after?: string;
} {
	if (expiry.level === "expired") {
		return { main: expiry.badgeText };
	}

	return expiry.daysLeft <= 1
		? { main: expiry.badgeText, after: "まで" }
		: { before: "あと", main: String(expiry.daysLeft), after: "日" };
}

function describeUseSoonSpoken(tile: InventoryTile): string {
	if (!tile.expiry) {
		return "";
	}

	if (tile.expiry.level === "expired") {
		return "期限切れ";
	}

	const { before = "", main, after = "" } = describeUseSoon(tile.expiry);

	return `${before}${main}${after}`;
}

type InventorySearchProps = {
	query: string;
	by: InventoryGroupBy;
	onQueryChange: (query: string) => void;
	onByChange: (by: InventoryGroupBy) => void;
};

// 検索の欄と、まとめ方の選択（上の操作の段に、1つの塊として置く）。
export function InventorySearch({
	query,
	by,
	onQueryChange,
	onByChange,
}: InventorySearchProps) {
	return (
		<div className={styles.search}>
			<span className={styles.searchField}>
				<TextInput
					type="search"
					placeholder="在庫を探す"
					aria-label="在庫を探す"
					value={query}
					onChange={(event) => onQueryChange(event.target.value)}
				/>
			</span>
			<span className={styles.groupBy}>
				<SelectBox
					aria-label="まとめ方"
					value={by}
					onChange={(event) => {
						const next = inventoryGroupByOptions.find(
							(option) => option.value === event.target.value,
						);

						if (next) {
							onByChange(next.value);
						}
					}}
				>
					{inventoryGroupByOptions.map((option) => (
						<option key={option.value} value={option.value}>
							{option.label}
						</option>
					))}
				</SelectBox>
			</span>
		</div>
	);
}

// 在庫の一覧：上に「早めに使う」、その下に、まとめ方（場所・期限・あいうえお）ごとの見出しで区切った行。
export function InventoryListView({
	zones,
	today,
	selectedItemId,
	highlightedItemIds,
	query,
	by,
	onOpen,
}: InventoryListViewProps) {
	const useSoonHeadingId = useId();

	const searched = useMemo(() => {
		const text = query.trim();

		return zones
			.flatMap((zone) => zone.tiles)
			.filter(
				(tile) =>
					tile.name.includes(text) || tile.ingredientName.includes(text),
			);
	}, [zones, query]);

	const sections = useMemo(() => {
		// 場所は、画面を開いたときに決めた並びのまま。ほかは、まとめ方の並び。
		const sorted =
			by === "zone" ? searched : [...searched].sort(compareTilesFor(by));

		return listInventoryGroups(by)
			.map((group) => ({
				...group,
				tiles: sorted.filter(
					(tile) => inventoryGroupOf(tile, by, today) === group.id,
				),
			}))
			.filter((section) => section.tiles.length > 0);
	}, [searched, by, today]);

	// 期限でまとめているときと、探しているときは、出さない（同じものが、すぐ下に並ぶ）。
	const useSoon =
		by === "expiry" || query.trim() !== ""
			? []
			: pickUseSoonTiles(zones.flatMap((zone) => zone.tiles));

	return (
		<div className={styles.wrap}>
			{useSoon.length > 0 ? (
				<section aria-labelledby={useSoonHeadingId}>
					<h2 className={styles.useSoonHead} id={useSoonHeadingId}>
						早めに使う
					</h2>
					<ul className={styles.useSoon}>
						{useSoon.map((tile) => {
							const text = tile.expiry ? describeUseSoon(tile.expiry) : null;

							return (
								<li key={tile.key}>
									<button
										className={styles.useSoonCard}
										type="button"
										aria-label={`${tile.name}（${text ? describeUseSoonSpoken(tile) : ""}）`}
										aria-haspopup="dialog"
										data-expiry={tile.expiry?.level}
										onClick={() => onOpen(tile)}
									>
										<span aria-hidden>
											<DishArt
												placements={resolveIngredientArt(tile.ingredientName)}
												size={44}
											/>
										</span>
										<span className={styles.useSoonName} aria-hidden>
											{tile.name}
										</span>
										{text ? (
											<span className={styles.useSoonWhen} aria-hidden>
												{text.before ? (
													<span className={styles.useSoonSmall}>
														{text.before}
													</span>
												) : null}
												{text.main}
												{text.after ? (
													<span className={styles.useSoonSmall}>
														{text.after}
													</span>
												) : null}
											</span>
										) : null}
									</button>
								</li>
							);
						})}
					</ul>
				</section>
			) : null}

			{sections.length === 0 ? (
				<p className={styles.empty}>見つかりませんでした。</p>
			) : (
				sections.map((section) => (
					<section className={styles.section} key={section.id}>
						<h2 className={styles.sectionHead}>
							{isZoneId(section.id) ? (
								<Icon name={zoneIcons[section.id]} size={20} />
							) : null}
							{section.label}
							<span className={styles.sectionCount}>
								{section.tiles.length}
							</span>
						</h2>
						<ul className={`${styles.rows} ${styles.rowsTwoColumns}`}>
							{section.tiles.map((tile) => (
								<li key={tile.key}>
									<InventoryRow
										tile={tile}
										selected={tile.inventoryItemId === selectedItemId}
										highlighted={highlightedItemIds?.has(tile.inventoryItemId)}
										showZone={by !== "zone"}
										onOpen={onOpen}
									/>
								</li>
							))}
						</ul>
					</section>
				))
			)}
		</div>
	);
}
