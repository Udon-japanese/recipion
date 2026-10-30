import { useRef, useState } from "react";
import { Icon } from "#/components/icon/icon";
import {
	type InventoryZoneId,
	inventoryZones,
} from "#/features/inventory/domain/inventory-fridge";
import * as styles from "./concepts.css";
import { ExpiryBadge, Glyph } from "./parts";
import { describeAmount, describeExpiry, type SampleItem } from "./sample-data";

type Drag = {
	id: string;
	x: number;
	y: number;
	overZone: InventoryZoneId | null;
	overBefore: string | null;
};

// C案：いまのパネルを、ドラッグで並べ替え・場所の移動ができるようにしたもの。
// つかむのは、右上の取っ手だけ（タッチでも、ふつうのスクロールと混ざらない）。
// 場所を変えることは、保存方法を変えること。取っ手を使えない人は、食材の詳細の「場所を変える」で同じことができる。
export function PanelView({
	items,
	onItemsChange,
	selectedId,
	onSelect,
}: {
	items: readonly SampleItem[];
	onItemsChange: (items: SampleItem[]) => void;
	selectedId: string | null;
	onSelect: (item: SampleItem) => void;
}) {
	const [drag, setDrag] = useState<Drag | null>(null);
	const [folded, setFolded] = useState<ReadonlySet<InventoryZoneId>>(new Set());
	const dragRef = useRef<Drag | null>(null);

	const update = (next: Drag | null) => {
		dragRef.current = next;
		setDrag(next);
	};

	const locate = (x: number, y: number) => {
		let overZone: InventoryZoneId | null = null;
		let overBefore: string | null = null;

		for (const element of document.elementsFromPoint(x, y)) {
			if (element instanceof HTMLElement) {
				overBefore ??= element.dataset.tileId ?? null;
				overZone ??= (element.dataset.zoneId as InventoryZoneId) ?? null;
			}
		}

		return { overZone, overBefore };
	};

	const drop = (current: Drag) => {
		const moving = items.find((item) => item.id === current.id);

		if (!moving || !current.overZone) {
			return;
		}

		const rest = items.filter((item) => item.id !== current.id);
		const moved = { ...moving, zone: current.overZone };
		const index = current.overBefore
			? rest.findIndex((item) => item.id === current.overBefore)
			: -1;

		onItemsChange(
			index >= 0
				? [...rest.slice(0, index), moved, ...rest.slice(index)]
				: [...rest, moved],
		);
	};

	const dragging = drag ? items.find((item) => item.id === drag.id) : null;

	return (
		<div style={{ display: "grid", gap: 14 }}>
			<p className={styles.caption}>
				右上の「⋮⋮」をつかんで動かします。別の場所に落とすと、保存方法が変わります。
			</p>
			{inventoryZones.map((zone) => {
				const zoneItems = items.filter((item) => item.zone === zone.id);
				const isFolded = folded.has(zone.id);

				return (
					<section
						className={styles.panelZone}
						key={zone.id}
						data-zone-id={zone.id}
						data-drop={drag?.overZone === zone.id}
						aria-label={zone.label}
					>
						<button
							className={styles.groupHeader}
							style={{ position: "static", background: "transparent" }}
							type="button"
							aria-expanded={!isFolded}
							onClick={() =>
								setFolded((current) => {
									const next = new Set(current);
									if (!next.delete(zone.id)) {
										next.add(zone.id);
									}
									return next;
								})
							}
						>
							<Icon
								name={isFolded ? "chevron-right" : "chevron-down"}
								size={20}
							/>
							{zone.label}
							<span className={styles.compartmentCount}>
								{zoneItems.length}件
							</span>
						</button>
						{isFolded ? null : (
							<ul className={styles.panelGrid}>
								{zoneItems.map((item) => (
									<li
										className={styles.tileItem}
										key={item.id}
										data-tile-id={item.id}
										data-dragging={drag?.id === item.id}
										data-drop-before={drag?.overBefore === item.id}
									>
										<button
											className={styles.itemButton}
											type="button"
											data-selected={item.id === selectedId}
											data-expiry={describeExpiry(item)?.level}
											onClick={() => onSelect(item)}
										>
											<Glyph item={item} />
											<span className={styles.itemName}>{item.name}</span>
											<span className={styles.itemAmount}>
												{describeAmount(item)}
											</span>
											<ExpiryBadge item={item} />
										</button>
										<button
											className={styles.grip}
											type="button"
											aria-label={`${item.name}を動かす`}
											onPointerDown={(event) => {
												event.currentTarget.setPointerCapture(event.pointerId);
												update({
													id: item.id,
													x: event.clientX,
													y: event.clientY,
													...locate(event.clientX, event.clientY),
												});
											}}
											onPointerMove={(event) => {
												if (dragRef.current) {
													update({
														id: dragRef.current.id,
														x: event.clientX,
														y: event.clientY,
														...locate(event.clientX, event.clientY),
													});
												}
											}}
											onPointerUp={() => {
												if (dragRef.current) {
													drop(dragRef.current);
												}
												update(null);
											}}
											onPointerCancel={() => update(null)}
										>
											<Icon name="grip" size={20} />
										</button>
									</li>
								))}
							</ul>
						)}
					</section>
				);
			})}
			{drag && dragging ? (
				<div className={styles.ghost} style={{ left: drag.x, top: drag.y }}>
					<span className={styles.itemButton}>
						<Glyph item={dragging} />
						<span className={styles.itemName}>{dragging.name}</span>
					</span>
				</div>
			) : null}
		</div>
	);
}
