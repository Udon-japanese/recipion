import { type ReactNode, useMemo, useState } from "react";
import { Card } from "#/components/card/card";
import { Chip, ChipGroup } from "#/components/chip/chip";
import { TextInput } from "#/components/field/field";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { Tag } from "#/components/tag/tag";
import {
	type InventoryZoneId,
	inventoryZoneLabels,
	inventoryZones,
} from "#/features/inventory/domain/inventory-fridge";
import * as styles from "./concepts.css";
import { kanaRowLabels, kanaRowOf, readingOf } from "./kana";
import { ItemRow } from "./parts";
import { compareByExpiry, type SampleItem } from "./sample-data";
import { ZoneTabs } from "./zone-tabs";

type GroupBy = "zone" | "expiry" | "kana";

// 縦タブの並びは、冷蔵庫の絵の上から順（野菜室は一番下）。
const zoneOrder: InventoryZoneId[] = [
	"fridge",
	"door",
	"freezer",
	"vegetable",
	"table",
];

type Group = {
	id: string;
	label: string;
	match: (item: SampleItem) => boolean;
};

function expiryBucket(item: SampleItem): string {
	const days = item.daysLeft;

	if (days === null) {
		return "none";
	}

	if (days < 0) {
		return "expired";
	}

	if (days <= 3) {
		return "soon";
	}

	return days <= 14 ? "week" : "later";
}

const expiryLabels: [string, string][] = [
	["expired", "切れている"],
	["soon", "3日以内"],
	["week", "2週間以内"],
	["later", "それより先"],
	["none", "期限なし"],
];

const groupsBy: Record<GroupBy, Group[]> = {
	zone: inventoryZones.map((zone) => ({
		id: zone.id,
		label: zone.label,
		match: (item) => item.zone === zone.id,
	})),
	expiry: expiryLabels.map(([id, label]) => ({
		id,
		label,
		match: (item) => expiryBucket(item) === id,
	})),
	kana: kanaRowLabels.map((label) => ({
		id: label,
		label,
		match: (item) => kanaRowOf(item.name) === label,
	})),
};

function sortFor(by: GroupBy) {
	return by === "kana"
		? (a: SampleItem, b: SampleItem) =>
				readingOf(a.name).localeCompare(readingOf(b.name), "ja")
		: compareByExpiry;
}

// B案：シンプルな一覧（レシピ・買い物メモと同じ作り）。
// 「場所・期限・あいうえお」をタブで選び、その中身はチップで一瞬で切り替える（畳む操作はなし）。
export function ListView({
	items,
	selectedId,
	onSelect,
	toggle,
}: {
	items: readonly SampleItem[];
	selectedId: string | null;
	onSelect: (item: SampleItem) => void;
	toggle: ReactNode;
}) {
	const [query, setQuery] = useState("");
	const [by, setBy] = useState<GroupBy>("zone");
	const [pick, setPick] = useState("all");

	const searched = useMemo(
		() => items.filter((item) => item.name.includes(query.trim())),
		[items, query],
	);
	const groups = groupsBy[by]
		.map((group) => ({
			...group,
			count: searched.filter(group.match).length,
		}))
		.filter((group) => group.count > 0);
	const active = groups.find((group) => group.id === pick);
	const shown = (active ? searched.filter(active.match) : [...searched]).sort(
		sortFor(by),
	);

	return (
		<div className={styles.listWrap}>
			<div className={styles.listHead}>
				<div style={{ flex: 1, minWidth: 0 }}>
					<TextInput
						type="search"
						placeholder="在庫を探す"
						aria-label="在庫を探す"
						value={query}
						onChange={(event) => setQuery(event.target.value)}
					/>
				</div>
				{toggle}
			</div>

			<SegmentedControl
				label="まとめ方"
				value={by}
				onChange={(value) => {
					setBy(value);
					setPick("all");
				}}
				options={[
					{ value: "zone", label: "場所" },
					{ value: "expiry", label: "期限" },
					{ value: "kana", label: "あいうえお" },
				]}
			/>

			<div className={styles.listBody}>
				{by === "zone" ? (
					<ZoneTabs
						zones={zoneOrder}
						value={active ? (active.id as InventoryZoneId) : null}
						counts={Object.fromEntries(
							groups.map((group) => [group.id, group.count]),
						)}
						onChange={(id) => setPick(id === pick ? "all" : id)}
					/>
				) : null}

				<div className={styles.listMain}>
					{by === "zone" ? null : (
						<div className={styles.chipScroll}>
							<ChipGroup label="絞り込み">
								<Chip pressed={!active} onClick={() => setPick("all")}>
									すべて {searched.length}
								</Chip>
								{groups.map((group) => (
									<Chip
										key={group.id}
										pressed={group.id === pick}
										onClick={() => setPick(group.id)}
									>
										{group.label} {group.count}
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
								{shown.map((item) => (
									<li key={item.id}>
										<ItemRow
											item={item}
											variant="row"
											selected={item.id === selectedId}
											onSelect={onSelect}
											extra={
												by === "zone" && active ? null : (
													<Tag>{inventoryZoneLabels[item.zone]}</Tag>
												)
											}
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
