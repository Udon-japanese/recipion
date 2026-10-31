import { Icon } from "#/components/icon/icon";
import type { IconName } from "#/components/icon/icon-definitions";
import {
	type InventoryZoneId,
	inventoryZones,
} from "../../domain/inventory-fridge";
import * as styles from "./list.css";

export const zoneIcons: Record<InventoryZoneId, IconName> = {
	fridge: "zone-fridge",
	door: "zone-door",
	vegetable: "zone-vegetable",
	freezer: "zone-freezer",
	table: "zone-table",
};

// 冷蔵庫の絵の上から順（野菜室は一番下）。
export const tabOrder: readonly InventoryZoneId[] = [
	"fridge",
	"door",
	"freezer",
	"vegetable",
	"table",
];

export const zoneLabels = Object.fromEntries(
	inventoryZones.map((zone) => [zone.id, zone.label]),
) as Record<InventoryZoneId, string>;

type ZoneTabsProps = {
	// 押されている場所（なければ「すべて」）。
	value: InventoryZoneId | null;
	counts: Partial<Record<InventoryZoneId, number>>;
	// もう一度、同じ場所を押すと、null（すべて）が渡る。
	onChange: (zone: InventoryZoneId | null) => void;
};

// 場所の縦タブ（一覧の左に縦に積む）。
export function ZoneTabs({ value, counts, onChange }: ZoneTabsProps) {
	return (
		<fieldset className={styles.zoneTabs} aria-label="場所">
			{tabOrder.map((id) => (
				<button
					className={styles.zoneTab}
					type="button"
					key={id}
					aria-pressed={id === value}
					onClick={() => onChange(id === value ? null : id)}
					onKeyDown={(event) => {
						const step =
							event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;

						if (step === 0) {
							return;
						}

						event.preventDefault();
						const tabs = [
							...(event.currentTarget.parentElement?.querySelectorAll(
								"button",
							) ?? []),
						];
						const index = tabs.indexOf(event.currentTarget);

						tabs[(index + step + tabs.length) % tabs.length]?.focus();
					}}
				>
					<Icon name={zoneIcons[id]} size={24} />
					{zoneLabels[id]}
					<span className={styles.zoneTabCount}>{counts[id] ?? 0}</span>
				</button>
			))}
		</fieldset>
	);
}
