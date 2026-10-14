import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconButton } from "#/components/icon-button/icon-button";
import { Mascot } from "#/components/mascot/mascot";
import { Note } from "#/components/note/note";
import { useMediaQuery } from "#/components/use-media-query";
import type { InventoryPurchaseOwnerScope } from "../application/inventory-purchase-outbox";
import type { InventoryListItem } from "../application/inventory-query-repository";
import type { LoadInventoryItemsResult } from "../application/load-inventory-items-with-cache";
import {
	buildInventoryFridge,
	compareTiles,
	type InventoryFridgeZone,
	type InventoryTile as InventoryTileModel,
	type InventoryZoneId,
} from "../domain/inventory-fridge";
import { toDateString } from "../domain/inventory-lot";
import * as fridgeStyles from "./fridge/fridge.css";
import { FridgeView } from "./fridge/fridge-view";
import * as styles from "./inventory-list.css";
import type { InventoryActions } from "./panel/inventory-actions";
import { ItemPanel, type ItemPanelMode } from "./panel/item-panel";

type LoadInventoryItems = () => Promise<LoadInventoryItemsResult>;

type InventoryListProps = InventoryActions & {
	ownerScope: InventoryPurchaseOwnerScope | null;
	loadInventoryItems: LoadInventoryItems;
	refreshKey?: number;
};

type Selection = {
	inventoryItemId: string;
	zone: InventoryZoneId;
	tileKey: string;
};

// 期限の並びが変わったかを見る鍵（期限を直したときだけ、並べ直す）。
function expiryFingerprint(item: InventoryListItem | undefined): string {
	return (item?.lots ?? [])
		.map((lot) => `${lot.id}:${lot.expiresOn ?? ""}`)
		.join("|");
}

// 在庫の画面：冷蔵庫の中を、上から見た断面として描く。食材（タイル）を押すと、パネルが開く。
export function InventoryList({
	ownerScope,
	loadInventoryItems,
	refreshKey = 0,
	...actions
}: InventoryListProps) {
	const [items, setItems] = useState<InventoryListItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [hasLoaded, setHasLoaded] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [itemsSource, setItemsSource] = useState<"network" | "cache">(
		"network",
	);
	const [cachedAt, setCachedAt] = useState<string | null>(null);
	const [selection, setSelection] = useState<Selection | null>(null);
	// タイルの並び：画面を開いたとき・更新したとき・期限を直したときだけ決め直す
	// （量を調整しても、押した場所が動かないように）。
	const [orderEpoch, setOrderEpoch] = useState(0);
	const rankRef = useRef(new Map<string, number>());
	const rankedEpochRef = useRef(-1);
	const today = useMemo(() => toDateString(new Date()), []);

	const isWide = useMediaQuery("(min-width: 1280px)");
	const isRightSheet = useMediaQuery("(min-width: 1024px)");
	const panelMode: ItemPanelMode = isWide
		? "fixed"
		: isRightSheet
			? "sheet-right"
			: "sheet-bottom";

	const isMember = ownerScope !== null && ownerScope !== "guest";

	const loadItems = useCallback(async () => {
		if (!ownerScope || ownerScope === "guest") {
			setItems([]);
			setItemsSource("network");
			setCachedAt(null);
			setErrorMessage(null);

			return;
		}

		setIsLoading(true);
		setErrorMessage(null);

		try {
			const result = await loadInventoryItems();

			setItems(result.items);
			setItemsSource(result.source);
			setCachedAt(result.cachedAt);
			setHasLoaded(true);
			setOrderEpoch((epoch) => epoch + 1);
		} catch {
			setErrorMessage("在庫を読み込めませんでした");
		} finally {
			setIsLoading(false);
		}
	}, [ownerScope, loadInventoryItems]);

	// biome-ignore lint: refreshKeyが変化したら再取得
	useEffect(() => {
		void loadItems();
	}, [loadItems, refreshKey]);

	const baseZones = useMemo(
		() => buildInventoryFridge(items, today),
		[items, today],
	);

	// 並びを決め直したとき（orderEpoch が変わったとき）だけ、いまのタイルの順位を控える。
	if (rankedEpochRef.current !== orderEpoch) {
		const ranks = new Map<string, number>();

		for (const zone of baseZones) {
			zone.tiles.forEach((tile, index) => {
				ranks.set(tile.key, index);
			});
		}

		rankRef.current = ranks;
		rankedEpochRef.current = orderEpoch;
	}

	const zones: InventoryFridgeZone[] = useMemo(() => {
		const ranks = rankRef.current;

		return baseZones.map((zone) => ({
			...zone,
			tiles: [...zone.tiles].sort((a, b) => {
				const aRank = ranks.get(a.key);
				const bRank = ranks.get(b.key);

				if (aRank !== undefined && bRank !== undefined) {
					return aRank - bRank;
				}

				// 新しく現れたタイルは、後ろ（同士は、通常の並び）。
				return aRank !== undefined
					? -1
					: bRank !== undefined
						? 1
						: compareTiles(a, b);
			}),
		}));
	}, [baseZones]);

	const selectedItem = selection
		? items.find((item) => item.inventoryItemId === selection.inventoryItemId)
		: undefined;

	const handleUpdate = useCallback(
		(inventoryItemId: string, update: Partial<InventoryListItem>) => {
			const before = items.find(
				(item) => item.inventoryItemId === inventoryItemId,
			);

			setItems((current) =>
				current.map((item) =>
					item.inventoryItemId === inventoryItemId
						? { ...item, ...update }
						: item,
				),
			);

			// 期限を直したときは、並べ直す。
			if (
				update.lots &&
				expiryFingerprint(before) !==
					expiryFingerprint({ ...before, ...update } as InventoryListItem)
			) {
				setOrderEpoch((epoch) => epoch + 1);
			}
		},
		[items],
	);

	const handleDeleted = useCallback((inventoryItemId: string) => {
		setItems((current) =>
			current.filter((item) => item.inventoryItemId !== inventoryItemId),
		);
		setSelection(null);
	}, []);

	function handleOpen(tile: InventoryTileModel) {
		setSelection({
			inventoryItemId: tile.inventoryItemId,
			zone: tile.zone,
			tileKey: tile.key,
		});
	}

	function handleClose() {
		const tileKey = selection?.tileKey;

		setSelection(null);

		// PC の固定のパネルは、閉じたら、押したタイルへフォーカスを戻す。
		if (tileKey) {
			window.setTimeout(() => {
				document
					.querySelector<HTMLElement>(
						`[data-tile-key="${CSS.escape(tileKey)}"]`,
					)
					?.focus({ preventScroll: true });
			}, 0);
		}
	}

	const isOffline = itemsSource === "cache";
	const hasItems = items.length > 0;
	const showFridge = isMember && hasItems;
	const showEmpty =
		isMember && hasLoaded && !isLoading && !errorMessage && !hasItems;
	const showSkeleton = isMember && isLoading && !hasItems;

	return (
		<section className={styles.container}>
			<div className={styles.header}>
				<h1 className={styles.title}>在庫</h1>

				{isMember ? (
					<IconButton
						icon="refresh"
						label="更新"
						size="std"
						disabled={isLoading}
						onClick={() => void loadItems()}
					/>
				) : null}
			</div>

			{ownerScope === null ? (
				<div className={styles.center}>
					<Mascot size={64} />
					<p>ログイン状態を確認しています…</p>
				</div>
			) : null}

			{ownerScope === "guest" ? (
				<div className={styles.center}>
					<Mascot size={64} />
					<p>ログインすると在庫を確認できます。</p>
				</div>
			) : null}

			{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}

			{isOffline && hasItems ? (
				<Note tone="neutral" icon="wifi-off">
					通信できないため、保存済みの在庫を表示しています。
					{cachedAt ? (
						<>
							{" "}
							最終更新:
							<time dateTime={cachedAt}>
								{new Date(cachedAt).toLocaleString("ja-JP")}
							</time>
						</>
					) : null}
				</Note>
			) : null}

			{showSkeleton ? (
				<div>
					<div className={styles.loadingBody} aria-hidden>
						{Array.from({ length: 6 }, (_, index) => (
							<div
								className={fridgeStyles.skeleton}
								// biome-ignore lint/suspicious/noArrayIndexKey: 同じ形の板が並ぶだけ
								key={index}
							/>
						))}
					</div>
					<p className={styles.loadingText}>在庫を読み込んでいます…</p>
				</div>
			) : null}

			{showEmpty ? (
				<div className={styles.emptyFridge}>
					<Mascot size={72} />
					<p className={styles.srOnly}>在庫はまだありません。</p>
				</div>
			) : null}

			{showFridge ? (
				<div className={styles.layout}>
					<FridgeView
						zones={zones}
						selectedItemId={selection?.inventoryItemId ?? null}
						onOpen={handleOpen}
					/>

					<div className={styles.panelColumn}>
						{selection && selectedItem && isWide ? (
							<ItemPanel
								key={selectedItem.inventoryItemId}
								item={selectedItem}
								zone={selection.zone}
								mode="fixed"
								actions={actions}
								readOnly={isOffline}
								onClose={handleClose}
								onUpdate={handleUpdate}
								onDeleted={handleDeleted}
							/>
						) : (
							<div className={styles.placeholder}>
								<Mascot size={64} motion="still" />
							</div>
						)}
					</div>
				</div>
			) : null}

			{selection && selectedItem && !isWide ? (
				<ItemPanel
					key={selectedItem.inventoryItemId}
					item={selectedItem}
					zone={selection.zone}
					mode={panelMode}
					actions={actions}
					readOnly={isOffline}
					onClose={handleClose}
					onUpdate={handleUpdate}
					onDeleted={handleDeleted}
				/>
			) : null}
		</section>
	);
}
