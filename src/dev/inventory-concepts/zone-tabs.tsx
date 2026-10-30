import { Icon } from "#/components/icon/icon";
import {
	type InventoryZoneId,
	inventoryZoneLabels,
} from "#/features/inventory/domain/inventory-fridge";
import * as styles from "./concepts.css";

const zoneIcons = {
	fridge: "zone-fridge",
	door: "zone-door",
	vegetable: "zone-vegetable",
	freezer: "zone-freezer",
	table: "zone-table",
} as const satisfies Record<InventoryZoneId, string>;

// 場所の縦タブ（パネルの左に縦に積む）。一覧でも、庫内でも使う。
export function ZoneTabs({
	zones,
	value,
	counts,
	onChange,
}: {
	zones: readonly InventoryZoneId[];
	value: InventoryZoneId | null;
	counts: Partial<Record<InventoryZoneId, number>>;
	onChange: (zone: InventoryZoneId) => void;
}) {
	return (
		<fieldset className={styles.zoneTabs} aria-label="場所">
			{zones.map((id) => (
				<button
					className={styles.zoneTab}
					type="button"
					key={id}
					aria-pressed={id === value}
					onClick={() => onChange(id)}
					onKeyDown={(event) => {
						// ↑↓で、隣のタブへ（端では、反対側へ）。
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
					{inventoryZoneLabels[id]}
					<span className={styles.zoneTabCount}>{counts[id] ?? 0}</span>
				</button>
			))}
		</fieldset>
	);
}
