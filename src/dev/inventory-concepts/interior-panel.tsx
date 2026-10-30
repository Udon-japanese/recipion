import { useMemo, useState } from "react";
import { Icon } from "#/components/icon/icon";
import type { IconName } from "#/components/icon/icon-definitions";
import {
	type InventoryZoneId,
	inventoryZoneLabels,
} from "#/features/inventory/domain/inventory-fridge";
import * as styles from "./concepts.css";
import { ExpiryBadge, Glyph, Pet } from "./parts";
import {
	compareByExpiry,
	describeAmount,
	describeExpiry,
	type SampleItem,
} from "./sample-data";

const zoneIcons: Record<InventoryZoneId, IconName> = {
	fridge: "zone-fridge",
	door: "zone-door",
	vegetable: "zone-vegetable",
	freezer: "zone-freezer",
	table: "zone-table",
};

type Props = {
	zones: readonly InventoryZoneId[];
	zone: InventoryZoneId;
	onZoneChange: (zone: InventoryZoneId) => void;
	items: readonly SampleItem[];
	night: boolean;
	petVisible: boolean;
	selectedId: string | null;
	onSelect: (item: SampleItem) => void;
	onBack: () => void;
};

// 庫内（机の上）。棚ごとに、期限の近いものを上に。多いときは棚を畳み、検索・絞り込みで探す。
export function InteriorPanel({
	zones,
	zone,
	onZoneChange,
	items,
	night,
	petVisible,
	selectedId,
	onSelect,
	onBack,
}: Props) {
	const [query, setQuery] = useState("");
	const [onlySoon, setOnlySoon] = useState(false);
	const [density, setDensity] = useState<"large" | "small">("large");
	const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
	const limit = density === "large" ? 8 : 12;

	const visible = useMemo(
		() =>
			items
				.filter((item) => item.zone === zone)
				.filter((item) => item.name.includes(query.trim()))
				.filter((item) => !onlySoon || describeExpiry(item) !== null)
				.sort(compareByExpiry),
		[items, zone, query, onlySoon],
	);

	const shelves = [
		{
			id: "alert",
			title: "もうすぐ切れる・切れた",
			alert: true,
			items: visible.filter((item) => describeExpiry(item) !== null),
		},
		{
			id: "dated",
			title: "期限あり",
			alert: false,
			items: visible.filter(
				(item) => item.daysLeft !== null && describeExpiry(item) === null,
			),
		},
		{
			id: "none",
			title: "期限なし",
			alert: false,
			items: visible.filter((item) => item.daysLeft === null),
		},
	].filter((shelf) => shelf.items.length > 0);

	return (
		<section className={styles.interior} aria-label={inventoryZoneLabels[zone]}>
			{petVisible ? (
				<Pet
					mood={night ? "sleep" : "peek"}
					isStatic
					style={{ right: "7cqw", top: "-9.6cqw" }}
				/>
			) : null}
			<h2 className={styles.interiorTitle}>
				<button className={styles.backButton} type="button" onClick={onBack}>
					<Icon name="chevron-left" size={20} />
					おうち
				</button>
				<Icon name={zoneIcons[zone]} size={20} />
				{inventoryZoneLabels[zone]}
				<span className={styles.compartmentCount}>{visible.length}件</span>
			</h2>

			{zones.length > 1 ? (
				<fieldset className={styles.zoneChips} aria-label="場所">
					{zones.map((id) => (
						<button
							className={styles.chip}
							type="button"
							key={id}
							aria-pressed={id === zone}
							onClick={() => onZoneChange(id)}
						>
							{inventoryZoneLabels[id]}（
							{items.filter((item) => item.zone === id).length}）
						</button>
					))}
				</fieldset>
			) : null}

			<div className={styles.toolbar}>
				<input
					className={styles.searchBox}
					type="search"
					placeholder={`${inventoryZoneLabels[zone]}の中を探す`}
					aria-label="食材を探す"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
				<button
					className={styles.chip}
					type="button"
					aria-pressed={onlySoon}
					onClick={() => setOnlySoon((value) => !value)}
				>
					期限が近い
				</button>
				<button
					className={styles.chip}
					type="button"
					aria-pressed={density === "small"}
					aria-label="小さく並べる"
					onClick={() =>
						setDensity((value) => (value === "large" ? "small" : "large"))
					}
				>
					<Icon name="rows" size={20} />
				</button>
			</div>

			<div className={styles.interiorScroll}>
				{shelves.length === 0 ? (
					<p className={styles.caption}>見つかりませんでした。</p>
				) : null}

				{shelves.map((shelf) => {
					const isOpen = expanded.has(shelf.id) || query.trim() !== "";
					const shown = isOpen ? shelf.items : shelf.items.slice(0, limit);

					return (
						<div className={styles.shelf} key={shelf.id}>
							<h3 className={styles.shelfHeading} data-alert={shelf.alert}>
								{shelf.alert ? <Icon name="alert-triangle" size={16} /> : null}
								{shelf.title}（{shelf.items.length}）
							</h3>
							<ul className={styles.shelfItems} data-density={density}>
								{shown.map((item) => (
									<li key={item.id}>
										<button
											className={styles.itemButton}
											type="button"
											data-density={density}
											data-selected={item.id === selectedId}
											data-expiry={describeExpiry(item)?.level}
											onClick={() => onSelect(item)}
										>
											<Glyph item={item} size={density === "large" ? 56 : 36} />
											<span className={styles.itemName}>{item.name}</span>
											<span className={styles.itemAmount}>
												{describeAmount(item)}
											</span>
											<ExpiryBadge item={item} />
										</button>
									</li>
								))}
							</ul>
							{shelf.items.length > limit && !query.trim() ? (
								<button
									className={styles.more}
									type="button"
									onClick={() =>
										setExpanded((current) => {
											const next = new Set(current);
											if (!next.delete(shelf.id)) {
												next.add(shelf.id);
											}
											return next;
										})
									}
								>
									{isOpen
										? "たたむ"
										: `ほか ${shelf.items.length - limit} 件を見る`}
								</button>
							) : null}
						</div>
					);
				})}
			</div>
		</section>
	);
}
