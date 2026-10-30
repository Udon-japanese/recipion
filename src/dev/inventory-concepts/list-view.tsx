import { useMemo, useState } from "react";
import { Icon } from "#/components/icon/icon";
import {
	type InventoryZoneId,
	inventoryZoneLabels,
	inventoryZones,
} from "#/features/inventory/domain/inventory-fridge";
import * as styles from "./concepts.css";
import { ExpiryBadge, Glyph } from "./parts";
import {
	compareByExpiry,
	describeAmount,
	describeExpiry,
	type SampleItem,
} from "./sample-data";

type GroupBy = "zone" | "expiry" | "kana";

const groupOptions: { value: GroupBy; label: string }[] = [
	{ value: "zone", label: "場所" },
	{ value: "expiry", label: "期限" },
	{ value: "kana", label: "あいうえお" },
];

type Group = { id: string; title: string; items: SampleItem[] };

function buildGroups(items: readonly SampleItem[], by: GroupBy): Group[] {
	if (by === "zone") {
		return inventoryZones
			.map((zone) => ({
				id: zone.id,
				title: zone.label,
				items: items
					.filter((item) => item.zone === zone.id)
					.sort(compareByExpiry),
			}))
			.filter((group) => group.items.length > 0);
	}

	if (by === "expiry") {
		const bucket = (item: SampleItem) =>
			item.daysLeft === null
				? "none"
				: item.daysLeft < 0
					? "expired"
					: item.daysLeft <= 3
						? "soon"
						: item.daysLeft <= 14
							? "week"
							: "later";
		const titles: [string, string][] = [
			["expired", "切れている"],
			["soon", "3日以内"],
			["week", "2週間以内"],
			["later", "それより先"],
			["none", "期限なし"],
		];

		return titles
			.map(([id, title]) => ({
				id,
				title,
				items: items
					.filter((item) => bucket(item) === id)
					.sort(compareByExpiry),
			}))
			.filter((group) => group.items.length > 0);
	}

	const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name, "ja"));

	return [{ id: "all", title: "すべて", items: sorted }];
}

// B案：シンプルなリスト（レシピ・買い物メモと同じ作り）。数が増えても、検索・グループの畳みで迷わない。
export function ListView({
	items,
	selectedId,
	onSelect,
}: {
	items: readonly SampleItem[];
	selectedId: string | null;
	onSelect: (item: SampleItem) => void;
}) {
	const [query, setQuery] = useState("");
	const [by, setBy] = useState<GroupBy>("zone");
	const [folded, setFolded] = useState<ReadonlySet<string>>(new Set());

	const groups = useMemo(
		() =>
			buildGroups(
				items.filter((item) => item.name.includes(query.trim())),
				by,
			),
		[items, query, by],
	);

	return (
		<div className={styles.listWrap}>
			<div className={styles.toolbar}>
				<input
					className={styles.searchBox}
					type="search"
					placeholder="在庫を探す"
					aria-label="在庫を探す"
					value={query}
					onChange={(event) => setQuery(event.target.value)}
				/>
			</div>
			<fieldset className={styles.toolbarGroup} aria-label="まとめ方">
				<span className={styles.caption}>まとめ方</span>
				{groupOptions.map((option) => (
					<button
						className={styles.chip}
						type="button"
						key={option.value}
						aria-pressed={by === option.value}
						onClick={() => setBy(option.value)}
					>
						{option.label}
					</button>
				))}
			</fieldset>

			{groups.map((group) => {
				const isFolded = folded.has(group.id);

				return (
					<section key={group.id}>
						<button
							className={styles.groupHeader}
							type="button"
							aria-expanded={!isFolded}
							onClick={() =>
								setFolded((current) => {
									const next = new Set(current);
									if (!next.delete(group.id)) {
										next.add(group.id);
									}
									return next;
								})
							}
						>
							<Icon
								name={isFolded ? "chevron-right" : "chevron-down"}
								size={20}
							/>
							{group.title}
							<span className={styles.compartmentCount}>
								{group.items.length}件
							</span>
						</button>
						{isFolded ? null : (
							<ul className={styles.rows}>
								{group.items.map((item) => (
									<li key={item.id}>
										<button
											className={styles.row}
											type="button"
											data-selected={item.id === selectedId}
											onClick={() => onSelect(item)}
										>
											<Glyph item={item} />
											<span className={styles.rowMain}>
												<span className={styles.itemName}>{item.name}</span>
												<span className={styles.rowSub}>
													{describeAmount(item)}
													{item.daysLeft !== null &&
													describeExpiry(item) === null
														? `・あと${item.daysLeft}日`
														: ""}
												</span>
											</span>
											<ExpiryBadge item={item} />
											{by !== "zone" ? (
												<span className={styles.zoneTag}>
													{inventoryZoneLabels[item.zone as InventoryZoneId]}
												</span>
											) : null}
										</button>
									</li>
								))}
							</ul>
						)}
					</section>
				);
			})}
		</div>
	);
}
