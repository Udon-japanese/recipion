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
import { InventoryScene } from "./scene/inventory-scene";
import { type InventoryView, ViewToggle } from "./view-toggle";

const viewStorageKey = "recipion.inventory.view";
const petStorageKey = "recipion.inventory.pet";

function readView(): InventoryView {
	try {
		return window.localStorage.getItem(viewStorageKey) === "scene"
			? "scene"
			: "list";
	} catch {
		return "list";
	}
}

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
	const [view, setView] = useState<InventoryView>("list");
	const [night, setNight] = useState(false);
	const [petVisible, setPetVisible] = useState(true);
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

	// 最後に選んだ表示を覚える（読み込めなければ、リスト）。時間は、描画のあとに見る。
	useEffect(() => {
		setView(readView());
		setNight(isNight(new Date()));

		try {
			setPetVisible(window.localStorage.getItem(petStorageKey) !== "off");
		} catch {
			// 読めなければ、表示する。
		}
	}, []);

	function changeView(next: InventoryView) {
		setView(next);

		try {
			window.localStorage.setItem(viewStorageKey, next);
		} catch {
			// 覚えられなくても、そのまま使える。
		}
	}

	function changePetVisible(next: boolean) {
		setPetVisible(next);

		try {
			window.localStorage.setItem(petStorageKey, next ? "on" : "off");
		} catch {
			// 覚えられなくても、そのまま使える。
		}
	}

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
	// おうちの表示では、操作（見出しは除く）を、絵の上部に重ねる。
	const isSceneShown = showFridge && view === "scene";
	const showEmpty =
		isMember && hasLoaded && !isLoading && !errorMessage && !hasItems;
	const showSkeleton = isMember && isLoading && !hasItems;

	const title = <h1 className={styles.title}>在庫</h1>;

	const toolbar = (
		<>
			{isMember && hasItems ? (
				<ViewToggle value={view} onChange={changeView} />
			) : null}

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

			{isMember && registration && hasItems ? (
				<span className={styles.addButton}>
					<Button
						leadingIcon={<Icon name="plus" size={20} />}
						aria-haspopup="dialog"
						onClick={() => handleRegistrationOpenChange(true)}
					>
						在庫に追加
					</Button>
				</span>
			) : null}
		</>
	);

	return (
		<section className={styles.container}>
			<div className={styles.header}>
				{title}
				{isSceneShown ? null : toolbar}
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
							onClick={() => handleRegistrationOpenChange(true)}
						>
							在庫に追加
						</Button>
					) : null}
				</div>
			) : null}

			{showFridge && view === "list" ? (
				<InventoryListView
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
					showFab={hasItems}
				/>
			) : null}
		</section>
	);
}
