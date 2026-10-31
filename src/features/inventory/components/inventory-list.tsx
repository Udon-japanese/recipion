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
import { MASCOT_DISPLAY_NAME } from "#/config/app";
import { useStorageItem } from "#/local-storage/use-storage-item";
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
import {
	inventoryGroupByStorage,
	inventoryPetStorage,
	inventoryViewStorage,
} from "../infrastructure/inventory-view-storage";
import * as styles from "./inventory-list.css";
import { InventoryListView, InventorySearch } from "./list/inventory-list-view";
import * as listStyles from "./list/list.css";
import type { InventoryActions } from "./panel/inventory-actions";
import { ItemPanel, type ItemPanelMode } from "./panel/item-panel";
import {
	type InventoryRegistrationConfig,
	InventoryRegistrationController,
} from "./registration/registration-controller";
import type { RegisteredInfo } from "./registration/use-inventory-registration";
import { InventoryScene, InventorySceneLoading } from "./scene/inventory-scene";
import { ViewToggle } from "./view-toggle";

// 夜の絵にする時間（18時〜翌5時）。
function isNight(date: Date): boolean {
	const hour = date.getHours();

	return hour >= 18 || hour < 5;
}

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
	// 「更新」を押したときだけ、お知らせを出す（最初の読み込みや、登録のあとの再取得では出さない）。
	const [refreshStatus, setRefreshStatus] = useState<
		"idle" | "refreshing" | "done"
	>("idle");
	const [itemsSource, setItemsSource] = useState<"network" | "cache">(
		"network",
	);
	const [cachedAt, setCachedAt] = useState<string | null>(null);
	const [selection, setSelection] = useState<Selection | null>(null);
	const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
	// 最後に選んだ表示（読み込み中の見た目も、これに合わせる）。この画面はサーバーで描かないので、最初の描画から保存した値になる。
	const [view, changeView] = useStorageItem(inventoryViewStorage);
	const [night] = useState(() => isNight(new Date()));
	const [petVisible, changePetVisible] = useStorageItem(inventoryPetStorage);
	// リストの検索と、まとめ方（最後に選んだもの。読み込めなければ、場所）。
	const [query, setQuery] = useState("");
	const [groupBy, setGroupBy] = useStorageItem(inventoryGroupByStorage);
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
	const isWide = useMediaQuery("(min-width: 768px)");
	const panelMode: ItemPanelMode = isWide ? "floating" : "sheet-bottom";

	const isMember = ownerScope !== null && ownerScope !== "guest";

	const loadItems = useCallback(async () => {
		if (!ownerScope || ownerScope === "guest") {
			setItems([]);
			setItemsSource("network");
			setCachedAt(null);
			setErrorMessage(null);

			return true;
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

			return true;
		} catch {
			setErrorMessage("在庫を読み込めませんでした");

			return false;
		} finally {
			setIsLoading(false);
		}
	}, [ownerScope, loadInventoryItems]);

	async function refresh() {
		setRefreshStatus("refreshing");
		setRefreshStatus((await loadItems()) ? "done" : "idle");
	}

	useEffect(() => {
		if (refreshStatus !== "done") {
			return;
		}

		const timer = window.setTimeout(() => setRefreshStatus("idle"), 3000);

		return () => window.clearTimeout(timer);
	}, [refreshStatus]);

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

		// 追加のパネルと、食材のパネルは、どちらか一方だけ開く。
		if (open) {
			setSelection(null);
		}

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
		// 追加のパネルと、食材のパネルは、どちらか一方だけ開く。
		handleRegistrationOpenChange(false);
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
	// 在庫があるか、読み込み中なら、表示の切り替えと追加を出す（読み込みのあとで、ボタンの位置が動かないように）。
	const showControls = isMember && (hasItems || showSkeleton);
	// おうちの表示では、操作を、絵の上部に重ねる。
	const isSceneShown = (showFridge || showSkeleton) && view === "scene";

	// 見出しは、読み上げのためだけ（下のナビに「在庫」とあるので、画面には出さない）。
	const title = <h1 className={styles.srOnly}>在庫</h1>;

	const viewToggle = showControls ? (
		<ViewToggle value={view} onChange={changeView} />
	) : null;

	const tools = (
		<span className={styles.tools} data-tools>
			{view === "scene" ? (
				<IconButton
					icon={petVisible ? "mascot-shown" : "mascot-hidden"}
					label={`${MASCOT_DISPLAY_NAME}を${petVisible ? "かくす" : "だす"}`}
					size="std"
					tone={petVisible ? "on" : "plain"}
					onClick={() => changePetVisible(!petVisible)}
				/>
			) : null}

			{isMember ? (
				<IconButton
					icon="refresh"
					label="更新"
					size="std"
					disabled={isLoading}
					onClick={() => void refresh()}
				/>
			) : null}
		</span>
	);

	const addButton =
		registration && showControls ? (
			<span className={styles.addButton}>
				<Button
					leadingIcon={<Icon name="plus" size={20} />}
					aria-haspopup="dialog"
					onClick={() => handleRegistrationOpenChange(true)}
				>
					在庫に追加
				</Button>
			</span>
		) : null;

	// リストでは、検索とまとめ方も、同じ段に並べる（読み込みの前後で、段を作り直さない）。
	const isListMode = showControls && view === "list";

	const toolbar = (
		<>
			{viewToggle}
			{isListMode ? (
				<InventorySearch
					query={query}
					by={groupBy}
					onQueryChange={setQuery}
					onByChange={setGroupBy}
				/>
			) : null}
			{tools}
			{addButton}
		</>
	);

	return (
		<section className={styles.container}>
			{title}
			{isSceneShown ? null : (
				<div className={isListMode ? listStyles.toolbar : styles.header}>
					{toolbar}
				</div>
			)}

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

			{refreshStatus === "refreshing" ? (
				<Note tone="info" icon="refresh" spinning>
					在庫を更新しています…
				</Note>
			) : null}

			{refreshStatus === "done" ? (
				<Note tone="success">在庫を更新しました</Note>
			) : null}

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
				<>
					<output className={styles.srOnly}>在庫を読み込んでいます</output>

					{view === "list" ? (
						<div className={listStyles.skeletonRows} aria-hidden>
							{Array.from({ length: 6 }, (_, index) => (
								<div
									className={listStyles.skeleton}
									// biome-ignore lint/suspicious/noArrayIndexKey: 同じ形の板が並ぶだけ
									key={index}
								/>
							))}
						</div>
					) : (
						<>
							{petVisible ? null : (
								<div className={styles.loadingNote}>
									<Note tone="info" spinning>
										在庫を読み込んでいます…
									</Note>
								</div>
							)}
							<InventorySceneLoading
								night={night}
								petVisible={petVisible}
								toolbar={toolbar}
							/>
						</>
					)}
				</>
			) : null}

			{showEmpty ? (
				<div className={styles.empty}>
					<Mascot size={72} />
					<p className={styles.srOnly}>在庫はまだありません。</p>
					{registration ? (
						<Button
							leadingIcon={<Icon name="plus" size={20} />}
							aria-haspopup="dialog"
							onClick={() => handleRegistrationOpenChange(true)}
						>
							在庫に追加
						</Button>
					) : null}
				</div>
			) : null}

			{showFridge && view === "list" ? (
				<InventoryListView
					query={query}
					by={groupBy}
					zones={zones}
					today={today}
					selectedItemId={selection?.inventoryItemId ?? null}
					highlightedItemIds={highlightedIds}
					onOpen={handleOpen}
				/>
			) : null}

			{showFridge && view === "scene" ? (
				<InventoryScene
					zones={zones}
					night={night}
					petVisible={petVisible}
					toolbar={toolbar}
					onDismissPanel={() => setSelection(null)}
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
					anchorPlacement={view === "scene" ? "beside" : "overlap"}
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
					onRegistered={handleRegistered}
					showFab={hasItems || showSkeleton}
				/>
			) : null}
		</section>
	);
}
