import { useCallback, useEffect, useMemo, useState } from "react";
import { QuantityInput } from "#/features/quantity/components/quantity-input";
import { formatStockAmount } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import { createManualInventoryAdjustment } from "../application/create-manual-inventory-adjustment";
import type {
	InventoryAdjustmentCommand,
	InventoryAdjustmentRepositoryResult,
} from "../application/inventory-adjustment-repository";
import type {
	RenameInventoryItemCommand,
	RenameInventoryItemResult,
} from "../application/inventory-item-management-repository";
import { maxInventoryDisplayNameLength } from "../application/inventory-item-management-repository";
import type {
	UpdateInventoryLotCommand,
	UpdateInventoryLotResult,
} from "../application/inventory-lot-repository";
import type { InventoryPurchaseOwnerScope } from "../application/inventory-purchase-outbox";
import type { InventoryListItem } from "../application/inventory-query-repository";
import type {
	ChangeInventoryTrackingModeCommand,
	ChangeInventoryTrackingModeResult,
} from "../application/inventory-tracking-mode-repository";
import type { LoadInventoryItemsResult } from "../application/load-inventory-items-with-cache";
import type { InventoryOperation } from "../domain/apply-inventory-adjustment";
import {
	expiryKindLabels,
	formatShortDate,
	storageLabels,
} from "../domain/expiry-labels";
import { type InventoryLot, toDateString } from "../domain/inventory-lot";
import type { QuantityTrackingMode } from "../domain/inventory-tracking-mode";
import type { InventoryUnitCode } from "../domain/inventory-unit";
import { recordExpiryHint } from "../infrastructure/expiry-hints-storage";
import {
	ExpiryFields,
	type ExpiryFieldsValue,
	emptyExpiryFields,
} from "./expiry-fields";
import * as styles from "./inventory-list.css";

type LoadInventoryItems = () => Promise<LoadInventoryItemsResult>;

type AdjustInventoryItem = (
	command: InventoryAdjustmentCommand,
) => Promise<InventoryAdjustmentRepositoryResult>;

type UpdateInventoryLot = (
	command: UpdateInventoryLotCommand,
) => Promise<UpdateInventoryLotResult>;

type DeleteInventoryItem = (inventoryItemId: string) => Promise<boolean>;

type RenameInventoryItem = (
	command: RenameInventoryItemCommand,
) => Promise<RenameInventoryItemResult>;

type ChangeTrackingMode = (
	command: ChangeInventoryTrackingModeCommand,
) => Promise<ChangeInventoryTrackingModeResult>;

type InventoryListProps = {
	ownerScope: InventoryPurchaseOwnerScope | null;
	loadInventoryItems: LoadInventoryItems;
	adjustInventoryItem?: AdjustInventoryItem;
	// ロットの期限・保存方法を更新する（渡さないと、編集のボタンは出ない）。
	updateInventoryLot?: UpdateInventoryLot;
	// 管理方法（有無だけ／だいたい／正確）を変える（渡さないと、切り替えのボタンは出ない）。
	changeTrackingMode?: ChangeTrackingMode;
	// 在庫の食材の削除（渡さないと、削除のボタンは出ない）。
	deleteInventoryItem?: DeleteInventoryItem;
	// 在庫の一覧に出す呼び名の変更（渡さないと、名前の変更のボタンは出ない）。
	renameInventoryItem?: RenameInventoryItem;
	refreshKey?: number;
};

// 個数・枚数・本数は、1/2 のような分数で表示する。g と ml は、小数のまま。
function formatStockQuantity(value: number, stockUnitCode: InventoryUnitCode) {
	return formatStockAmount(value, stockUnitCode);
}

// ロットの期限の表示（「消費期限 10/10」。目安は「約」を付ける）。
function formatLotExpiry(lot: InventoryLot): string | null {
	if (!lot.expiresOn) {
		return lot.expiryKind === "none" ? "期限なし" : null;
	}

	const kind =
		lot.expiryKind && lot.expiryKind !== "none"
			? expiryKindLabels[lot.expiryKind]
			: "期限";
	const approximate = lot.expirySource === "estimated" ? "約 " : "";

	return `${kind} ${approximate}${formatShortDate(lot.expiresOn)}`;
}

export function InventoryList({
	ownerScope,
	loadInventoryItems,
	adjustInventoryItem,
	updateInventoryLot,
	changeTrackingMode,
	deleteInventoryItem,
	renameInventoryItem,
	refreshKey = 0,
}: InventoryListProps) {
	// 削除の確認中の食材。
	const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
	// 呼び名を変えている食材と、入力中の呼び名。
	const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
	const [renameValue, setRenameValue] = useState("");
	const [items, setItems] = useState<InventoryListItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [adjustingItemId, setAdjustingItemId] = useState<string | null>(null);
	const [adjustmentQuantity, setAdjustmentQuantity] = useState("1");
	// 減らすとき、ロットごとに数量を指定するか（複数のロットがあるときだけ選べる）。
	const [isLotSpecified, setIsLotSpecified] = useState(false);
	const [lotQuantities, setLotQuantities] = useState<Record<string, string>>(
		{},
	);
	const [isAdjusting, setIsAdjusting] = useState(false);
	// 有無だけ → 数量を追う管理に変えるときの入力（いまの量と、管理方法）。
	const [trackingChangeItemId, setTrackingChangeItemId] = useState<
		string | null
	>(null);
	const [trackingChangeQuantity, setTrackingChangeQuantity] = useState("");
	const [trackingChangeMode, setTrackingChangeMode] =
		useState<QuantityTrackingMode>("estimated");
	// ロットの期限・保存方法の編集。
	const [editingLotId, setEditingLotId] = useState<string | null>(null);
	const [lotExpiry, setLotExpiry] =
		useState<ExpiryFieldsValue>(emptyExpiryFields);
	const [saveAsDefault, setSaveAsDefault] = useState(false);
	const [isSavingLot, setIsSavingLot] = useState(false);
	const today = useMemo(() => toDateString(new Date()), []);
	const [itemsSource, setItemsSource] = useState<"network" | "cache">(
		"network",
	);
	const [cachedAt, setCachedAt] = useState<string | null>(null);

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
		} catch {
			setErrorMessage("在庫を読み込めませんでした");
		} finally {
			setIsLoading(false);
		}
	}, [ownerScope, loadInventoryItems]);

	function handleStartAdjustment(item: InventoryListItem) {
		setErrorMessage(null);
		setAdjustingItemId(item.inventoryItemId);
		setAdjustmentQuantity("1");
	}

	function handleStartEditingLot(item: InventoryListItem, lot: InventoryLot) {
		setErrorMessage(null);
		setEditingLotId(lot.id);
		// 空の項目は、食材の初期値（ユーザーが決めたもの）を入れる。
		setLotExpiry({
			expiresOn: lot.expiresOn ?? "",
			expiryKind: lot.expiryKind ?? item.defaultExpiryKind ?? "",
			storage: lot.storage ?? item.defaultStorage ?? "",
			// 自動の目安だった日付は、そのまま保存しても、目安のまま（直したときに、入力になる）。
			expirySource: lot.expirySource ?? "",
		});
		setSaveAsDefault(false);
	}

	function handleCancelEditingLot() {
		setEditingLotId(null);
		setLotExpiry(emptyExpiryFields);
		setSaveAsDefault(false);
	}

	async function handleSaveLot(item: InventoryListItem, lot: InventoryLot) {
		if (!updateInventoryLot) {
			return;
		}

		setErrorMessage(null);
		setIsSavingLot(true);

		try {
			const result = await updateInventoryLot({
				lotId: lot.id,
				expiresOn: lotExpiry.expiresOn === "" ? null : lotExpiry.expiresOn,
				expirySource:
					lotExpiry.expirySource === "" ? null : lotExpiry.expirySource,
				expiryKind: lotExpiry.expiryKind === "" ? null : lotExpiry.expiryKind,
				storage: lotExpiry.storage === "" ? null : lotExpiry.storage,
				saveAsIngredientDefault: saveAsDefault,
			});

			setItems((currentItems) =>
				currentItems.map((currentItem) =>
					currentItem.inventoryItemId === item.inventoryItemId
						? {
								...currentItem,
								quantity: result.quantity,
								lots: result.lots,
								defaultExpiryKind: result.defaultExpiryKind,
								defaultStorage: result.defaultStorage,
							}
						: currentItem,
				),
			);

			// 入力した期限（目安ではないもの）は、次の目安のために、覚える。
			if (lotExpiry.expirySource === "entered" && lotExpiry.expiresOn !== "") {
				recordExpiryHint({
					ingredientName: item.name,
					acquiredOn: lot.acquiredOn,
					expiresOn: lotExpiry.expiresOn,
					storage: lotExpiry.storage === "" ? null : lotExpiry.storage,
				});
			}

			handleCancelEditingLot();
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "ロットを更新できませんでした",
			);
		} finally {
			setIsSavingLot(false);
		}
	}

	function applyItemUpdate(
		inventoryItemId: string,
		update: Partial<InventoryListItem>,
	) {
		setItems((currentItems) =>
			currentItems.map((currentItem) =>
				currentItem.inventoryItemId === inventoryItemId
					? { ...currentItem, ...update }
					: currentItem,
			),
		);
	}

	// 有無だけの食材の「ある」「なくなった」。数量は扱わない。
	async function handlePresenceToggle(
		item: InventoryListItem,
		operation: InventoryOperation,
	) {
		if (!adjustInventoryItem) {
			return;
		}

		setErrorMessage(null);
		setIsAdjusting(true);

		try {
			const result = await adjustInventoryItem(
				createManualInventoryAdjustment({
					inventoryItemId: item.inventoryItemId,
					quantity: 1,
					stockUnitCode: item.stockUnitCode,
					operation,
				}),
			);

			applyItemUpdate(item.inventoryItemId, {
				quantity: result.quantity,
				lots: result.lots,
			});
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "在庫を変更できませんでした",
			);
		} finally {
			setIsAdjusting(false);
		}
	}

	async function handleDelete(item: InventoryListItem) {
		if (!deleteInventoryItem) {
			return;
		}

		setErrorMessage(null);
		setIsAdjusting(true);

		try {
			await deleteInventoryItem(item.inventoryItemId);
			// すでに消えていた（見つからない）ときも、一覧からは消す。
			setItems((currentItems) =>
				currentItems.filter(
					(currentItem) => currentItem.inventoryItemId !== item.inventoryItemId,
				),
			);
			setDeletingItemId(null);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "在庫を削除できませんでした",
			);
		} finally {
			setIsAdjusting(false);
		}
	}

	async function handleRename(item: InventoryListItem) {
		if (!renameInventoryItem) {
			return;
		}

		setErrorMessage(null);
		setIsAdjusting(true);

		try {
			const result = await renameInventoryItem({
				inventoryItemId: item.inventoryItemId,
				displayName: renameValue.trim() === "" ? null : renameValue,
			});

			applyItemUpdate(item.inventoryItemId, {
				displayName: result.displayName,
			});
			setRenamingItemId(null);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "名前を変更できませんでした",
			);
		} finally {
			setIsAdjusting(false);
		}
	}

	async function handleChangeTrackingMode(
		item: InventoryListItem,
		command: Omit<ChangeInventoryTrackingModeCommand, "inventoryItemId">,
	) {
		if (!changeTrackingMode) {
			return;
		}

		setErrorMessage(null);
		setIsAdjusting(true);

		try {
			const result = await changeTrackingMode({
				inventoryItemId: item.inventoryItemId,
				...command,
			});

			applyItemUpdate(item.inventoryItemId, {
				trackingMode: result.trackingMode,
				quantity: result.quantity,
				lots: result.lots,
			});
			setTrackingChangeItemId(null);
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "管理方法を変更できませんでした",
			);
		} finally {
			setIsAdjusting(false);
		}
	}

	function handleCancelAdjustment() {
		setAdjustingItemId(null);
		setAdjustmentQuantity("1");
		setIsLotSpecified(false);
		setLotQuantities({});
	}

	async function handleAdjustment(
		item: InventoryListItem,
		operation: InventoryOperation,
	) {
		if (!adjustInventoryItem) {
			return;
		}

		setErrorMessage(null);
		setIsAdjusting(true);

		try {
			// ロットを指定して減らすときは、数量が入っているロットだけを、そのまま送る。
			const allocations =
				operation === "decrease" && isLotSpecified
					? item.lots.flatMap((lot) => {
							const quantity =
								parseQuantityInput(lotQuantities[lot.id] ?? "") ?? 0;

							return quantity > 0 ? [{ lotId: lot.id, quantity }] : [];
						})
					: undefined;

			if (allocations && allocations.length === 0) {
				setErrorMessage("減らすロットの数量を入力してください");

				return;
			}

			const command = createManualInventoryAdjustment({
				inventoryItemId: item.inventoryItemId,
				quantity: allocations
					? allocations.reduce(
							(sum, allocation) => sum + allocation.quantity,
							0,
						)
					: (parseQuantityInput(adjustmentQuantity) ?? Number.NaN),
				stockUnitCode: item.stockUnitCode,
				operation,
				allocations,
			});

			const result = await adjustInventoryItem(command);

			setItems((currentItems) =>
				currentItems.map((currentItem) =>
					currentItem.inventoryItemId === item.inventoryItemId
						? {
								...currentItem,
								quantity: result.quantity,
								lots: result.lots,
							}
						: currentItem,
				),
			);

			handleCancelAdjustment();
		} catch (error) {
			setErrorMessage(
				error instanceof Error
					? error.message
					: "在庫数量を変更できませんでした",
			);
		} finally {
			setIsAdjusting(false);
		}
	}

	// biome-ignore lint: refreshKeyが変化したら再取得
	useEffect(() => {
		void loadItems();
	}, [loadItems, refreshKey]);

	return (
		<section className={styles.container}>
			<div className={styles.header}>
				<h2 className={styles.title}>在庫</h2>

				{ownerScope && ownerScope !== "guest" ? (
					<button
						className={styles.reloadButton}
						type="button"
						disabled={isLoading}
						onClick={() => void loadItems()}
					>
						更新
					</button>
				) : null}
			</div>

			{ownerScope === null ? (
				<p className={styles.message}>ログイン状態を確認しています…</p>
			) : null}

			{ownerScope === "guest" ? (
				<p className={styles.message}>ログインすると在庫を確認できます。</p>
			) : null}

			{isLoading ? (
				<p className={styles.message}>在庫を読み込んでいます…</p>
			) : null}

			{errorMessage ? (
				<p className={styles.error} role="alert">
					{errorMessage}
				</p>
			) : null}

			{itemsSource === "cache" && items.length > 0 ? (
				<output className={styles.message}>
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
				</output>
			) : null}

			{ownerScope !== null &&
			ownerScope !== "guest" &&
			!isLoading &&
			!errorMessage &&
			items.length === 0 ? (
				<p className={styles.message}>在庫はまだありません。</p>
			) : null}

			{items.length > 0 ? (
				<ul className={styles.list}>
					{items.map((item) => (
						<li className={styles.item} key={item.inventoryItemId}>
							<div className={styles.itemSummary}>
								<span className={styles.itemName}>
									{item.displayName ?? item.name}
									{item.displayName ? (
										<span className={styles.originalName}>（{item.name}）</span>
									) : null}
								</span>

								{item.trackingMode === "presence" ? (
									<span className={styles.quantity}>
										{item.quantity > 0 ? "あり" : "なし"}
									</span>
								) : (
									<span className={styles.quantity}>
										{item.trackingMode === "estimated" ? "約 " : ""}
										{formatStockQuantity(item.quantity, item.stockUnitCode)}
										{item.stockUnitLabel}
									</span>
								)}

								{item.trackingMode === "presence" && adjustInventoryItem ? (
									<button
										className={styles.adjustButton}
										type="button"
										disabled={isAdjusting || itemsSource === "cache"}
										onClick={() =>
											void handlePresenceToggle(
												item,
												item.quantity > 0 ? "decrease" : "increase",
											)
										}
									>
										{item.quantity > 0 ? "なくなった" : "ある"}
									</button>
								) : null}

								{item.trackingMode !== "presence" && adjustInventoryItem ? (
									<button
										className={styles.adjustButton}
										type="button"
										disabled={isAdjusting || itemsSource === "cache"}
										onClick={() => handleStartAdjustment(item)}
									>
										調整
									</button>
								) : null}

								{changeTrackingMode && itemsSource !== "cache" ? (
									item.trackingMode === "presence" ? (
										<button
											className={styles.adjustButton}
											type="button"
											disabled={isAdjusting}
											onClick={() => {
												setTrackingChangeItemId(item.inventoryItemId);
												setTrackingChangeQuantity("");
												setTrackingChangeMode("estimated");
											}}
										>
											量を追う管理にする
										</button>
									) : (
										<button
											className={styles.adjustButton}
											type="button"
											disabled={isAdjusting}
											onClick={() =>
												void handleChangeTrackingMode(item, {
													trackingMode: "presence",
												})
											}
										>
											有無だけにする
										</button>
									)
								) : null}

								{renameInventoryItem && itemsSource !== "cache" ? (
									<button
										className={styles.adjustButton}
										type="button"
										disabled={isAdjusting}
										aria-label={`${item.displayName ?? item.name}の名前を変更`}
										onClick={() => {
											setRenamingItemId(item.inventoryItemId);
											setRenameValue(item.displayName ?? "");
										}}
									>
										名前を変更
									</button>
								) : null}

								{deleteInventoryItem && itemsSource !== "cache" ? (
									<button
										className={styles.adjustButton}
										type="button"
										disabled={isAdjusting}
										aria-label={`${item.displayName ?? item.name}を在庫から削除`}
										onClick={() => setDeletingItemId(item.inventoryItemId)}
									>
										削除
									</button>
								) : null}
							</div>

							{renamingItemId === item.inventoryItemId ? (
								<div className={styles.adjustmentForm}>
									<label className={styles.adjustmentField}>
										<span className={styles.adjustmentLabel}>
											在庫の一覧に出す名前（{item.name}
											のまま、レシピとの照合に使います）
										</span>
										<input
											className={styles.input}
											aria-label={`${item.name}の呼び名`}
											value={renameValue}
											maxLength={maxInventoryDisplayNameLength}
											placeholder={item.name}
											onChange={(event) => setRenameValue(event.target.value)}
										/>
									</label>

									<div className={styles.adjustmentActions}>
										<button
											className={styles.cancelButton}
											type="button"
											disabled={isAdjusting}
											onClick={() => setRenamingItemId(null)}
										>
											キャンセル
										</button>

										<button
											className={styles.increaseButton}
											type="button"
											disabled={isAdjusting}
											onClick={() => void handleRename(item)}
										>
											{renameValue.trim() === ""
												? "元の名前に戻す"
												: "この名前にする"}
										</button>
									</div>
								</div>
							) : null}

							{deletingItemId === item.inventoryItemId ? (
								<div className={styles.adjustmentForm}>
									<p className={styles.message}>
										「{item.displayName ?? item.name}
										」を在庫から削除します。ロットと履歴も消えます。よろしいですか。
									</p>

									<div className={styles.adjustmentActions}>
										<button
											className={styles.cancelButton}
											type="button"
											disabled={isAdjusting}
											onClick={() => setDeletingItemId(null)}
										>
											やめる
										</button>

										<button
											className={styles.decreaseButton}
											type="button"
											disabled={isAdjusting}
											onClick={() => void handleDelete(item)}
										>
											削除する
										</button>
									</div>
								</div>
							) : null}

							{trackingChangeItemId === item.inventoryItemId ? (
								<div className={styles.adjustmentForm}>
									<div className={styles.adjustmentField}>
										<span className={styles.adjustmentLabel}>
											{item.name}のいまの量
										</span>

										<span className={styles.quantityInput}>
											<QuantityInput
												className={styles.input}
												aria-label={`${item.name}のいまの量`}
												value={trackingChangeQuantity}
												onChange={setTrackingChangeQuantity}
												showFractionButtons={item.stockUnitCode === "count"}
											/>
											<span>{item.stockUnitLabel}</span>
										</span>
									</div>

									<label className={styles.adjustmentField}>
										<span className={styles.adjustmentLabel}>管理方法</span>
										<select
											className={styles.input}
											value={trackingChangeMode}
											onChange={(event) =>
												setTrackingChangeMode(
													event.target.value === "exact"
														? "exact"
														: "estimated",
												)
											}
										>
											<option value="estimated">だいたいで管理</option>
											<option value="exact">正確に管理</option>
										</select>
									</label>

									<div className={styles.adjustmentActions}>
										<button
											className={styles.cancelButton}
											type="button"
											disabled={isAdjusting}
											onClick={() => setTrackingChangeItemId(null)}
										>
											キャンセル
										</button>

										<button
											className={styles.increaseButton}
											type="button"
											disabled={isAdjusting}
											onClick={() => {
												const quantity =
													trackingChangeQuantity.trim() === ""
														? 0
														: parseQuantityInput(trackingChangeQuantity);

												if (quantity === null) {
													setErrorMessage(
														"数量を確認してください（例：2、0.5、1/2）",
													);

													return;
												}

												void handleChangeTrackingMode(item, {
													trackingMode: trackingChangeMode,
													currentQuantity: quantity,
												});
											}}
										>
											この量で管理する
										</button>
									</div>
								</div>
							) : null}

							{item.lots.length > 0 ? (
								<ul
									className={styles.lotList}
									aria-label={`${item.name}のロット`}
								>
									{item.lots.map((lot) => {
										const expiryText = formatLotExpiry(lot);

										return (
											<li className={styles.lotItem} key={lot.id}>
												<div className={styles.lot}>
													<span className={styles.lotInfo}>
														<span>{formatShortDate(lot.acquiredOn)}に追加</span>
														{lot.storage ? (
															<span className={styles.lotBadge}>
																{storageLabels[lot.storage]}
															</span>
														) : null}
														{expiryText ? <span>{expiryText}</span> : null}
													</span>

													{item.trackingMode === "presence" ? null : (
														<span>
															{item.trackingMode === "estimated" ? "約 " : ""}
															{formatStockQuantity(
																lot.quantity,
																item.stockUnitCode,
															)}
															{item.stockUnitLabel}
														</span>
													)}

													{updateInventoryLot && itemsSource !== "cache" ? (
														<button
															className={styles.lotEditButton}
															type="button"
															disabled={isSavingLot}
															aria-label={`${formatShortDate(lot.acquiredOn)}に追加のロットの期限を編集`}
															onClick={() => handleStartEditingLot(item, lot)}
														>
															期限
														</button>
													) : null}
												</div>

												{editingLotId === lot.id ? (
													<div className={styles.lotEditForm}>
														<ExpiryFields
															idPrefix={`lot-${lot.id}`}
															value={lotExpiry}
															onChange={setLotExpiry}
															today={today}
															disabled={isSavingLot}
														/>

														<label className={styles.lotSpecificationToggle}>
															<input
																type="checkbox"
																checked={saveAsDefault}
																onChange={(event) =>
																	setSaveAsDefault(event.target.checked)
																}
															/>
															この食材の初期値にする（期限の種類・保存方法）
														</label>

														<div className={styles.adjustmentActions}>
															<button
																className={styles.cancelButton}
																type="button"
																disabled={isSavingLot}
																onClick={handleCancelEditingLot}
															>
																キャンセル
															</button>
															<button
																className={styles.increaseButton}
																type="button"
																disabled={isSavingLot}
																onClick={() => void handleSaveLot(item, lot)}
															>
																保存
															</button>
														</div>
													</div>
												) : null}
											</li>
										);
									})}
								</ul>
							) : null}

							{adjustingItemId === item.inventoryItemId ? (
								<div className={styles.adjustmentForm}>
									<div className={styles.adjustmentField}>
										<span className={styles.adjustmentLabel}>
											{item.name}の調整数量
										</span>

										<span className={styles.quantityInput}>
											<QuantityInput
												className={styles.input}
												aria-label={`${item.name}の調整数量`}
												value={adjustmentQuantity}
												onChange={setAdjustmentQuantity}
												showFractionButtons={item.stockUnitCode === "count"}
											/>
											<span>{item.stockUnitLabel}</span>
										</span>
									</div>

									{item.lots.length > 1 ? (
										<div className={styles.lotSpecification}>
											<label className={styles.lotSpecificationToggle}>
												<input
													type="checkbox"
													checked={isLotSpecified}
													onChange={(event) =>
														setIsLotSpecified(event.target.checked)
													}
												/>
												ロットを指定して減らす
											</label>

											{isLotSpecified
												? item.lots.map((lot) => (
														<label
															className={styles.adjustmentField}
															key={lot.id}
														>
															<span className={styles.adjustmentLabel}>
																{formatShortDate(lot.acquiredOn)}に追加（
																{formatStockQuantity(
																	lot.quantity,
																	item.stockUnitCode,
																)}
																{item.stockUnitLabel}）
															</span>
															<input
																className={styles.input}
																aria-label={`${formatShortDate(lot.acquiredOn)}に追加のロットから減らす数量`}
																type="number"
																inputMode="decimal"
																min="0"
																step="any"
																value={lotQuantities[lot.id] ?? ""}
																onChange={(event) =>
																	setLotQuantities((current) => ({
																		...current,
																		[lot.id]: event.target.value,
																	}))
																}
															/>
														</label>
													))
												: null}
										</div>
									) : null}

									<div className={styles.adjustmentActions}>
										<button
											className={styles.cancelButton}
											type="button"
											disabled={isAdjusting}
											onClick={handleCancelAdjustment}
										>
											キャンセル
										</button>

										<button
											className={styles.decreaseButton}
											type="button"
											disabled={isAdjusting || item.quantity === 0}
											onClick={() => void handleAdjustment(item, "decrease")}
										>
											減らす
										</button>

										<button
											className={styles.increaseButton}
											type="button"
											disabled={isAdjusting}
											onClick={() => void handleAdjustment(item, "increase")}
										>
											増やす
										</button>
									</div>
								</div>
							) : null}
						</li>
					))}
				</ul>
			) : null}
		</section>
	);
}
