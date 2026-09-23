import { useCallback, useEffect, useState } from "react";
import { createManualInventoryAdjustment } from "../application/create-manual-inventory-adjustment";
import type {
	InventoryAdjustmentCommand,
	InventoryAdjustmentRepositoryResult,
} from "../application/inventory-adjustment-repository";
import type { InventoryListItem } from "../application/inventory-query-repository";
import type { LoadInventoryItemsResult } from "../application/load-inventory-items-with-cache";
import type { InventoryOperation } from "../domain/apply-inventory-adjustment";
import type { InventoryPurchaseOwnerScope } from "../infrastructure/inventory-purchase-outbox";
import * as styles from "./inventory-list.css";

type LoadInventoryItems = () => Promise<LoadInventoryItemsResult>;

type AdjustInventoryItem = (
	command: InventoryAdjustmentCommand,
) => Promise<InventoryAdjustmentRepositoryResult>;

type InventoryListProps = {
	ownerScope: InventoryPurchaseOwnerScope | null;
	loadInventoryItems: LoadInventoryItems;
	adjustInventoryItem?: AdjustInventoryItem;
	refreshKey?: number;
};

const quantityFormatter = new Intl.NumberFormat("ja-JP", {
	maximumFractionDigits: 6,
});

export function InventoryList({
	ownerScope,
	loadInventoryItems,
	adjustInventoryItem,
	refreshKey = 0,
}: InventoryListProps) {
	const [items, setItems] = useState<InventoryListItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [adjustingItemId, setAdjustingItemId] = useState<string | null>(null);
	const [adjustmentQuantity, setAdjustmentQuantity] = useState("1");
	const [isAdjusting, setIsAdjusting] = useState(false);
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

	function handleCancelAdjustment() {
		setAdjustingItemId(null);
		setAdjustmentQuantity("1");
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
			const command = createManualInventoryAdjustment({
				inventoryItemId: item.inventoryItemId,
				quantity: Number(adjustmentQuantity),
				stockUnitCode: item.stockUnitCode,
				operation,
			});

			const result = await adjustInventoryItem(command);

			setItems((currentItems) =>
				currentItems.map((currentItem) =>
					currentItem.inventoryItemId === item.inventoryItemId
						? {
								...currentItem,
								quantity: result.quantity,
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
								<span className={styles.itemName}>{item.name}</span>

								<span className={styles.quantity}>
									{item.trackingMode === "estimated" ? "約 " : ""}
									{quantityFormatter.format(item.quantity)}
									{item.stockUnitLabel}
								</span>

								{adjustInventoryItem ? (
									<button
										className={styles.adjustButton}
										type="button"
										disabled={isAdjusting || itemsSource === "cache"}
										onClick={() => handleStartAdjustment(item)}
									>
										調整
									</button>
								) : null}
							</div>

							{adjustingItemId === item.inventoryItemId ? (
								<div className={styles.adjustmentForm}>
									<label className={styles.adjustmentField}>
										<span className={styles.adjustmentLabel}>
											{item.name}の調整数量
										</span>

										<span className={styles.quantityInput}>
											<input
												className={styles.input}
												aria-label={`${item.name}の調整数量`}
												type="number"
												inputMode="decimal"
												min="0.000001"
												step="any"
												value={adjustmentQuantity}
												onChange={(event) =>
													setAdjustmentQuantity(event.target.value)
												}
											/>
											<span>{item.stockUnitLabel}</span>
										</span>
									</label>

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
