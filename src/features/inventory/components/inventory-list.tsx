import {
	type ReactNode,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "#/components/button/button";
import { Icon } from "#/components/icon/icon";
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
import * as styles from "./inventory-list.css";
import { InventoryListView } from "./list/inventory-list-view";
import * as listStyles from "./list/list.css";
import type { InventoryActions } from "./panel/inventory-actions";
import { ItemPanel, type ItemPanelMode } from "./panel/item-panel";
import {
	type InventoryRegistrationConfig,
	InventoryRegistrationController,
} from "./registration/registration-controller";
import type { RegisteredInfo } from "./registration/use-inventory-registration";

type LoadInventoryItems = () => Promise<LoadInventoryItemsResult>;

type InventoryListProps = InventoryActions & {
	ownerScope: InventoryPurchaseOwnerScope | null;
	loadInventoryItems: LoadInventoryItems;
	refreshKey?: number;
	// 在庫に追加するパネルと、期限の目安の設定（省略すると、追加の入口を出さない）。
	registration?: InventoryRegistrationConfig;
	// 見出しの下に出すお知らせ（同期の状態・ゲスト購入の引き継ぎ）。
	notices?: ReactNode;
};

type Selection = {
	inventoryItemId: string;
	zone: InventoryZoneId;
	tileKey: string;
};

// 満タンの量：単位が変わったときは、量の変わった割合で直す。いまの量が超えたら、引き上げる（サーバーと同じ）。
function nextCapacity(
	item: InventoryListItem,
	update: Partial<InventoryListItem>,
): number {
	const quantity = update.quantity ?? item.quantity;
	const isUnitChanged =
		(update.stockUnitCode !== undefined &&
			update.stockUnitCode !== item.stockUnitCode) ||
		(update.stockUnitLabel !== undefined &&
			update.stockUnitLabel !== item.stockUnitLabel);
	const base = isUnitChanged
		? item.quantity > 0
			? (item.capacity * quantity) / item.quantity
			: 0
		: (update.capacity ?? item.capacity);

	return Math.max(base, quantity);
}

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
	registration,
	notices,
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
	const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
	const [isSettingsOpen, setIsSettingsOpen] = useState(false);
	// 登録のパネルを開いている間に追加した食材。閉じたあと、タイルに輪を出す。
	const addedItemIdsRef = useRef(new Set<string>());
	const [highlightedIds, setHighlightedIds] = useState<ReadonlySet<string>>(
		new Set(),
	);
	// タイルの並び：画面を開いたとき・更新したとき・期限を直したときだけ決め直す
	// （量を調整しても、押した場所が動かないように）。
	const [orderEpoch, setOrderEpoch] = useState(0);
	const rankRef = useRef(new Map<string, number>());
	const rankedEpochRef = useRef(-1);
	const today = useMemo(() => toDateString(new Date()), []);

	// 広い画面：ドラッグで動かせる浮いたパネル（一覧を見ながら操作できる）。狭い画面：下のシート。
	const isWide = useMediaQuery("(min-width: 1024px)");
	const panelMode: ItemPanelMode = isWide ? "floating" : "sheet-bottom";

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
						? {
								...item,
								...update,
								capacity: nextCapacity(item, update),
							}
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

	const selectionTileKey = selection?.tileKey;

	const handleDeleted = useCallback(
		(inventoryItemId: string) => {
			// 消した食材のタイルの、次（なければ前）のタイルへ、フォーカスを移す。
			const deleted = selectionTileKey
				? document.querySelector<HTMLElement>(
						`[data-tile-key="${CSS.escape(selectionTileKey)}"]`,
					)
				: null;
			const tiles = deleted
				? Array.from(
						deleted.closest("ul")?.querySelectorAll<HTMLElement>("button") ??
							[],
					)
				: [];
			const index = deleted ? tiles.indexOf(deleted) : -1;
			const nextKey =
				tiles[index + 1]?.dataset.tileKey ?? tiles[index - 1]?.dataset.tileKey;

			setItems((current) =>
				current.filter((item) => item.inventoryItemId !== inventoryItemId),
			);
			setSelection(null);

			if (nextKey) {
				window.setTimeout(() => {
					document
						.querySelector<HTMLElement>(
							`[data-tile-key="${CSS.escape(nextKey)}"]`,
						)
						?.focus({ preventScroll: true });
				}, 0);
			}
		},
		[selectionTileKey],
	);

	function handleRegistered(info: RegisteredInfo) {
		if (info.inventoryItemId) {
			addedItemIdsRef.current.add(info.inventoryItemId);
		}

		void loadItems();
	}

	function handleRegistrationOpenChange(open: boolean) {
		setIsRegistrationOpen(open);

		if (open || addedItemIdsRef.current.size === 0) {
			return;
		}

		// 閉じたら、追加した食材のタイルに、2px の輪を出す（動きを減らす設定では、長めに出しっぱなし）。
		const reduced =
			typeof window.matchMedia === "function" &&
			window.matchMedia("(prefers-reduced-motion: reduce)").matches;

		setHighlightedIds(new Set(addedItemIdsRef.current));
		addedItemIdsRef.current = new Set();
		window.setTimeout(
			() => setHighlightedIds(new Set()),
			reduced ? 2000 : 1200,
		);
	}

	function handleOpen(tile: InventoryTileModel) {
		// 広い画面で、追加のパネルを開いている間は、行を押しても何も開かない（閉じてから）。
		if (isRegistrationOpen && isWide) {
			return;
		}

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

				{isMember && registration ? (
					<IconButton
						icon="sliders"
						label="期限の目安の設定"
						size="std"
						onClick={() => setIsSettingsOpen(true)}
					/>
				) : null}

				{isMember ? (
					<IconButton
						icon="refresh"
						label="更新"
						size="std"
						disabled={isLoading}
						onClick={() => void loadItems()}
					/>
				) : null}

				{isMember && registration && hasItems ? (
					<span className={styles.addButton}>
						<Button
							leadingIcon={<Icon name="plus" size={20} />}
							aria-haspopup="dialog"
							onClick={() => setIsRegistrationOpen(true)}
						>
							在庫に追加
						</Button>
					</span>
				) : null}
			</div>

			{notices}

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
					<div className={listStyles.skeletonRows} aria-hidden>
						{Array.from({ length: 6 }, (_, index) => (
							<div
								className={listStyles.skeleton}
								// biome-ignore lint/suspicious/noArrayIndexKey: 同じ形の板が並ぶだけ
								key={index}
							/>
						))}
					</div>
					<p className={styles.loadingText}>在庫を読み込んでいます…</p>
				</div>
			) : null}

			{showEmpty ? (
				<div className={styles.empty}>
					<Mascot size={72} />
					<p className={styles.srOnly}>在庫はまだありません。</p>
					{registration ? (
						<Button
							leadingIcon={<Icon name="plus" size={20} />}
							aria-haspopup="dialog"
							onClick={() => setIsRegistrationOpen(true)}
						>
							在庫に追加
						</Button>
					) : null}
				</div>
			) : null}

			{showFridge ? (
				<InventoryListView
					zones={zones}
					today={today}
					selectedItemId={selection?.inventoryItemId ?? null}
					highlightedItemIds={highlightedIds}
					onOpen={handleOpen}
				/>
			) : null}

			{selection && selectedItem ? (
				<ItemPanel
					key={selectedItem.inventoryItemId}
					item={selectedItem}
					zone={selection.zone}
					mode={panelMode}
					actions={actions}
					anchorTileKey={selection.tileKey}
					readOnly={isOffline}
					onClose={handleClose}
					onUpdate={handleUpdate}
					onDeleted={handleDeleted}
				/>
			) : null}

			{isMember && registration ? (
				<InventoryRegistrationController
					config={registration}
					isOpen={isRegistrationOpen}
					onOpenChange={handleRegistrationOpenChange}
					isSettingsOpen={isSettingsOpen}
					onSettingsOpenChange={setIsSettingsOpen}
					onRegistered={handleRegistered}
					showFab={hasItems}
				/>
			) : null}
		</section>
	);
}
