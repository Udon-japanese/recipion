import { type KeyboardEvent, useId, useRef, useState } from "react";
import { Icon } from "#/components/icon/icon";
import type { IconName } from "#/components/icon/icon-definitions";
import type {
	InventoryFridgeZone,
	InventoryTile as InventoryTileModel,
	InventoryZoneId,
} from "../../domain/inventory-fridge";
import * as styles from "./fridge.css";
import { InventoryTile } from "./inventory-tile";

const zoneIcons: Record<InventoryZoneId, IconName> = {
	fridge: "zone-fridge",
	door: "zone-door",
	vegetable: "zone-vegetable",
	freezer: "zone-freezer",
	table: "zone-table",
};

type FridgeViewProps = {
	zones: readonly InventoryFridgeZone[];
	selectedItemId: string | null;
	// 追加した直後の食材（タイルに輪を出す）。
	highlightedItemIds?: ReadonlySet<string>;
	onOpen: (tile: InventoryTileModel) => void;
};

type ZoneSectionProps = {
	zone: InventoryFridgeZone;
	selectedItemId: string | null;
	highlightedItemIds: ReadonlySet<string>;
	onOpen: (tile: InventoryTileModel) => void;
};

// 矢印キーで、タイルの間を動く。Tab の停止は、ゾーンごとに1つ（ロービング）。
function moveFocus(event: KeyboardEvent<HTMLUListElement>) {
	const keys = [
		"ArrowLeft",
		"ArrowRight",
		"ArrowUp",
		"ArrowDown",
		"Home",
		"End",
	];

	if (!keys.includes(event.key)) {
		return null;
	}

	const buttons = Array.from(
		event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
	);
	const current = buttons.indexOf(document.activeElement as HTMLButtonElement);

	if (current < 0) {
		return null;
	}

	// 1行に並ぶ個数（最初の行の、上の位置が同じタイルの数）。
	const firstTop = buttons[0]?.offsetTop ?? 0;
	const columns = Math.max(
		1,
		buttons.filter((button) => button.offsetTop === firstTop).length,
	);
	const next =
		event.key === "ArrowLeft"
			? current - 1
			: event.key === "ArrowRight"
				? current + 1
				: event.key === "ArrowUp"
					? current - columns
					: event.key === "ArrowDown"
						? current + columns
						: event.key === "Home"
							? 0
							: buttons.length - 1;

	return buttons[next] ?? null;
}

function ZoneSection({
	zone,
	selectedItemId,
	highlightedItemIds,
	onOpen,
}: ZoneSectionProps) {
	const headingId = useId();
	const [activeKey, setActiveKey] = useState<string | null>(null);
	const listRef = useRef<HTMLUListElement>(null);
	// ロービングの停止位置：選ばれたタイル、なければ先頭。
	const stopKey = zone.tiles.some((tile) => tile.key === activeKey)
		? activeKey
		: (zone.tiles[0]?.key ?? null);

	return (
		<section
			className={zone.inside ? styles.zone : styles.outsideZone}
			data-zone={zone.id}
			aria-labelledby={headingId}
		>
			<h2 className={styles.zoneHeading} id={headingId}>
				<Icon name={zoneIcons[zone.id]} size={20} />
				{zone.label}
				<span className={styles.zoneCount}>
					<span className={styles.srOnly}>、</span>
					{zone.tiles.length}件
				</span>
			</h2>

			{zone.id === "vegetable" || zone.id === "freezer" ? (
				<div className={styles.handle} aria-hidden />
			) : null}

			{zone.tiles.length > 0 ? (
				<ul
					className={styles.tiles}
					ref={listRef}
					onKeyDown={(event) => {
						const target = moveFocus(event);

						if (target) {
							event.preventDefault();
							target.focus();
						}
					}}
				>
					{zone.tiles.map((tile) => (
						<InventoryTile
							key={tile.key}
							tile={tile}
							selected={tile.inventoryItemId === selectedItemId}
							highlighted={highlightedItemIds.has(tile.inventoryItemId)}
							tabIndex={tile.key === stopKey ? 0 : -1}
							onOpen={onOpen}
							onFocus={(focused) => setActiveKey(focused.key)}
						/>
					))}
				</ul>
			) : null}

			{zone.id === "table" && zone.tiles.length > 0 ? (
				<div className={styles.tableTop} aria-hidden />
			) : null}
		</section>
	);
}

// 冷蔵庫の中を、上から見た断面として描く。庫内の4ゾーンを箱で囲み、その外に机の上を置く。
const noHighlight: ReadonlySet<string> = new Set();

export function FridgeView({
	zones,
	selectedItemId,
	highlightedItemIds = noHighlight,
	onOpen,
}: FridgeViewProps) {
	const inside = zones.filter((zone) => zone.inside);
	const outside = zones.filter((zone) => !zone.inside);

	return (
		<div className={styles.fridge}>
			<div className={styles.body}>
				{inside.map((zone) => (
					<ZoneSection
						key={zone.id}
						zone={zone}
						selectedItemId={selectedItemId}
						highlightedItemIds={highlightedItemIds}
						onOpen={onOpen}
					/>
				))}
			</div>

			{outside.map((zone) => (
				<ZoneSection
					key={zone.id}
					zone={zone}
					selectedItemId={selectedItemId}
					highlightedItemIds={highlightedItemIds}
					onOpen={onOpen}
				/>
			))}
		</div>
	);
}
