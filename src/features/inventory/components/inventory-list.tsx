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
import { useExitPresence } from "#/components/sheet/use-exit-presence";
import {
	dismissPendingToast,
	dismissToast,
	showToast,
} from "#/components/toast/toast-store";
import { useMediaQuery } from "#/components/use-media-query";
import { MASCOT_DISPLAY_NAME } from "#/config/app";
import { normalizeIngredientName } from "#/features/ingredients/domain/normalize-ingredient-name";
import { useStorageItem } from "#/local-storage/use-storage-item";
import type { InventoryPurchaseOwnerScope } from "../application/inventory-purchase-outbox";
import type { InventoryListItem } from "../application/inventory-query-repository";
import type { LoadInventoryItemsResult } from "../application/load-inventory-items-with-cache";
import {
	buildInventoryFridge,
	compareTiles,
	hideOutOfStockTiles,
	type InventoryFridgeZone,
	type InventoryTile as InventoryTileModel,
	type InventoryZoneId,
} from "../domain/inventory-fridge";
import {
	type InventoryLotPurchaseUnit,
	toDateString,
} from "../domain/inventory-lot";
import { usePurchaseUnitMemory } from "../hooks/use-purchase-unit-memory";
import {
	type InventoryView,
	inventoryGroupByStorage,
	inventoryHideEmptyStorage,
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

const refreshToastId = "inventory-refresh";

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
	const [itemsSource, setItemsSource] = useState<"network" | "cache">(
		"network",
	);
	const [cachedAt, setCachedAt] = useState<string | null>(null);
	const [cacheReason, setCacheReason] =
		useState<LoadInventoryItemsResult["cacheReason"]>(null);
	// 登録はできたが、そのあとの読み直しが、サーバーから取れなかった（一覧に、まだ出ていない）。
	const [isRegisteredButStale, setIsRegisteredButStale] = useState(false);
	const [selection, setSelection] = useState<Selection | null>(null);
	// 一覧が誰のものか。別の人（ゲストを含む）に変わったら、前の人の一覧・開いているパネルを、すぐに消す。
	const [itemsOwner, setItemsOwner] = useState(ownerScope);
	// 最後に始めた読み込みの番号（あとから届いた古い結果は、捨てる）。
	const latestLoadRef = useRef(0);

	if (ownerScope !== null && ownerScope !== itemsOwner) {
		setItemsOwner(ownerScope);
		setItems([]);
		setSelection(null);
		setHasLoaded(false);
		setIsRegisteredButStale(false);
	}
	const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
	// 買い物メモの換算の記憶。換算の候補と、決めた換算の保存先（買い物メモと共有）。
	const purchaseUnitMemory = usePurchaseUnitMemory(ownerScope);

	// すでにある同じ食材の、ロットの換算（新しい順）。登録の候補になる。
	function lookupLotPurchaseUnits(
		ingredientName: string,
	): InventoryLotPurchaseUnit[] {
		// 食材名が空のときは、正規化できない（候補もなし）。
		if (ingredientName.trim() === "") {
			return [];
		}

		const key = normalizeIngredientName(ingredientName);
		const item = items.find(
			(candidate) => normalizeIngredientName(candidate.name) === key,
		);

		return [...(item?.lots ?? [])]
			.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
			.flatMap((lot) => lot.purchaseUnit ?? []);
	}
	// 最後に選んだ表示（読み込み中の見た目も、これに合わせる）。この画面はサーバーで描かないので、最初の描画から保存した値になる。
	const [view, setView] = useStorageItem(inventoryViewStorage);
	const [night] = useState(() => isNight(new Date()));
	const [petVisible, changePetVisible] = useStorageItem(inventoryPetStorage);
	const [hideEmpty, changeHideEmpty] = useStorageItem(
		inventoryHideEmptyStorage,
	);
	// おうちの表示で、絵の下に、右下の＋を置けるだけの床があるか（縦に長いスマホ）。
	const [sceneHasFloorRoom, setSceneHasFloorRoom] = useState(false);
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

	// 表示を切り替えたら、開いている食材のパネルは閉じる（パネルは、押したタイルの横に出るので、切り替えると置き場がなくなる）。
	function changeView(next: InventoryView) {
		setView(next);
		setSelection(null);
	}

	const isMember = ownerScope !== null && ownerScope !== "guest";

	// 読み込んで、表示に反映する。反映した結果を返す（失敗・古くなった・ゲストは null）。
	const loadItems =
		useCallback(async (): Promise<LoadInventoryItemsResult | null> => {
			const loadId = latestLoadRef.current + 1;

			latestLoadRef.current = loadId;

			if (!ownerScope || ownerScope === "guest") {
				setItems([]);
				setItemsSource("network");
				setCachedAt(null);
				setCacheReason(null);
				setErrorMessage(null);
				setIsLoading(false);

				return null;
			}

			setIsLoading(true);
			setErrorMessage(null);

			try {
				const result = await loadInventoryItems();

				if (latestLoadRef.current !== loadId) {
					return null;
				}

				setItems(result.items);
				setItemsSource(result.source);
				setCachedAt(result.cachedAt);
				setCacheReason(result.cacheReason);
				setHasLoaded(true);
				setOrderEpoch((epoch) => epoch + 1);

				if (result.source === "network") {
					setIsRegisteredButStale(false);
				}

				return result;
			} catch {
				if (latestLoadRef.current === loadId) {
					setErrorMessage("在庫を読み込めませんでした");
				}

				return null;
			} finally {
				if (latestLoadRef.current === loadId) {
					setIsLoading(false);
				}
			}
		}, [ownerScope, loadInventoryItems]);

	// 「更新」：画面の上のお知らせで、更新中と、更新したことを伝える（失敗は、一覧の上のエラーに出る）。
	// お知らせは「更新」を押したときだけ（最初の読み込みや、登録のあとの再取得では出さない）。
	async function refresh() {
		showToast({
			id: refreshToastId,
			message: "在庫を更新しています…",
			spinning: true,
			duration: null,
		});

		if (await loadItems()) {
			showToast({
				id: refreshToastId,
				message: "在庫を更新しました",
				icon: "check",
			});
		} else {
			dismissToast(refreshToastId);
		}
	}

	// 画面を離れたら、更新中のお知らせは消す。
	useEffect(() => () => dismissPendingToast(refreshToastId), []);

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

	const keptItemId = selection?.inventoryItemId ?? null;
	const zones: InventoryFridgeZone[] = useMemo(() => {
		const ranks = rankRef.current;
		// ない在庫をかくすとき：開いている食材は、パネルを閉じるまで残す。
		const shownZones = hideEmpty
			? hideOutOfStockTiles(baseZones, keptItemId)
			: baseZones;

		return shownZones.map((zone) => ({
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
	}, [baseZones, hideEmpty, keptItemId]);

	const selectedItem = selection
		? items.find((item) => item.inventoryItemId === selection.inventoryItemId)
		: undefined;
	// パネル（スマホはシート）は、閉じる動きのあいだも、最後に開いていた食材を描く。
	// 消した食材は一覧から無くなるので、そのまま閉じる。
	const shownSelection = useExitPresence(selectedItem ? selection : null);
	const shownItemId = shownSelection.value?.inventoryItemId;
	const shownItem = shownItemId
		? items.find((item) => item.inventoryItemId === shownItemId)
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

		void loadItems().then((result) => {
			if (result?.source !== "network") {
				setIsRegisteredButStale(true);
			}
		});
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
			{showControls ? (
				<IconButton
					icon={hideEmpty ? "eye-off" : "eye"}
					label={hideEmpty ? "ない在庫を出す" : "ない在庫をかくす"}
					size="std"
					tone={hideEmpty ? "on" : "plain"}
					onClick={() => changeHideEmpty(!hideEmpty)}
				/>
			) : null}

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
			<>
				<span className={styles.addButton}>
					<Button
						leadingIcon={<Icon name="plus" size={20} />}
						aria-haspopup="dialog"
						onClick={() => handleRegistrationOpenChange(true)}
					>
						在庫に追加
					</Button>
				</span>
				{/* おうちの表示（スマホ）：絵の下に床がなければ、右下の＋は絵に重なるので、絵の上の操作の段に置く。 */}
				{view === "scene" && !sceneHasFloorRoom ? (
					<button
						className={styles.sceneAddButton}
						type="button"
						aria-label="在庫に追加"
						aria-haspopup="dialog"
						onClick={() => handleRegistrationOpenChange(true)}
					>
						<Icon name="plus" size={24} />
					</button>
				) : null}
			</>
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
		<section className={styles.container} data-view={view}>
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

			{isRegisteredButStale ? (
				<Note tone="warn">
					在庫に追加しましたが、一覧を読み直せませんでした。「更新」を押すか、通信が戻ってから開き直すと、出てきます。
				</Note>
			) : null}

			{isOffline && hasItems ? (
				<Note tone="neutral" icon="wifi-off">
					{cacheReason === "server"
						? "在庫を読み込めなかったため、保存済みの在庫を表示しています。"
						: "通信できないため、保存済みの在庫を表示しています。"}
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
								onFloorRoomChange={setSceneHasFloorRoom}
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
					hidingEmpty={hideEmpty}
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
					onFloorRoomChange={setSceneHasFloorRoom}
					onDismissPanel={() => setSelection(null)}
					selectedItemId={selection?.inventoryItemId ?? null}
					highlightedItemIds={highlightedIds}
					onOpen={handleOpen}
				/>
			) : null}

			{shownSelection.value && shownItem ? (
				<ItemPanel
					key={shownItem.inventoryItemId}
					open={shownSelection.open}
					item={shownItem}
					zone={shownSelection.value.zone}
					mode={panelMode}
					actions={actions}
					purchaseUnitMemory={purchaseUnitMemory}
					anchorTileKey={shownSelection.value.tileKey}
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
					showFab={
						(hasItems || showSkeleton) &&
						(view !== "scene" || sceneHasFloorRoom)
					}
					fabOnScene={view === "scene"}
					purchaseUnitMemory={purchaseUnitMemory}
					lookupLotPurchaseUnits={lookupLotPurchaseUnits}
				/>
			) : null}
		</section>
	);
}
