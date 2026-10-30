import { useEffect, useMemo, useRef, useState } from "react";
import { Chip } from "#/components/chip/chip";
import { TextInput } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import { IconButton } from "#/components/icon-button/icon-button";
import {
	type InventoryZoneId,
	inventoryZoneLabels,
} from "#/features/inventory/domain/inventory-fridge";
import * as styles from "./concepts.css";
import { ItemRow, Pet } from "./parts";
import {
	compareByExpiry,
	describeExpiry,
	type SampleItem,
} from "./sample-data";
import { ZoneTabs } from "./zone-tabs";

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

const shelfLimit = 8;

// 庫内（机の上）。棚ごとに、期限の近いものを上に。多いときは棚の表示数を絞り、検索・絞り込みで探す。
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
	const sectionRef = useRef<HTMLElement>(null);
	const [query, setQuery] = useState("");
	const [onlySoon, setOnlySoon] = useState(false);
	const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

	// 開いたら、キーボードの位置を庫内へ移す（閉じるときは、場面の側が元の場所へ戻す）。
	useEffect(() => {
		sectionRef.current?.focus();
	}, []);

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
		<div className={styles.interiorWrap}>
			{zones.length > 1 ? (
				<ZoneTabs
					zones={zones}
					value={zone}
					counts={Object.fromEntries(
						zones.map((id) => [
							id,
							items.filter((item) => item.zone === id).length,
						]),
					)}
					onChange={onZoneChange}
				/>
			) : null}
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
						style={{ left: "8cqw", top: "-9.6cqw" }}
					/>
				) : null}

				<h2 className={styles.interiorHead}>
					<IconButton
						icon="chevron-left"
						label="おうちにもどる"
						size="std"
						onClick={onBack}
					/>
					{inventoryZoneLabels[zone]}
					<span className={styles.count}>{visible.length}件</span>
				</h2>

				<div className={styles.searchRow}>
					<div className={styles.searchGrow}>
						<TextInput
							type="search"
							placeholder={`${inventoryZoneLabels[zone]}の中を探す`}
							aria-label="食材を探す"
							value={query}
							onChange={(event) => setQuery(event.target.value)}
						/>
					</div>
					<Chip
						pressed={onlySoon}
						onClick={() => setOnlySoon((value) => !value)}
					>
						期限が近い
					</Chip>
				</div>

				<div className={styles.interiorScroll}>
					{shelves.length === 0 ? (
						<p className={styles.empty}>見つかりませんでした。</p>
					) : null}

					{shelves.map((shelf) => {
						const isOpen = expanded.has(shelf.id) || query.trim() !== "";
						const shown = isOpen
							? shelf.items
							: shelf.items.slice(0, shelfLimit);

						return (
							<div className={styles.shelf} key={shelf.id}>
								<h3 className={styles.shelfHeading} data-alert={shelf.alert}>
									{shelf.alert ? (
										<Icon name="alert-triangle" size={16} />
									) : null}
									{shelf.title}（{shelf.items.length}）
								</h3>
								<ul className={styles.shelfItems}>
									{shown.map((item) => (
										<li key={item.id}>
											<ItemRow
												item={item}
												variant="card"
												selected={item.id === selectedId}
												onSelect={onSelect}
											/>
										</li>
									))}
								</ul>
								{shelf.items.length > shelfLimit && !query.trim() ? (
									<div className={styles.moreRow}>
										<Chip
											icon={isOpen ? "arrow-up" : "arrow-down"}
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
												: `ほか ${shelf.items.length - shelfLimit} 件`}
										</Chip>
									</div>
								) : null}
							</div>
						);
					})}
				</div>
			</section>
		</div>
	);
}
