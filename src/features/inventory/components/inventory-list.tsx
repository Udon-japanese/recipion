import { useCallback, useEffect, useState } from "react";

import type { InventoryListItem } from "../application/inventory-query-repository";
import type { InventoryPurchaseOwnerScope } from "../infrastructure/inventory-purchase-outbox";
import * as styles from "./inventory-list.css";

type LoadInventoryItems = () => Promise<InventoryListItem[]>;

type InventoryListProps = {
	ownerScope: InventoryPurchaseOwnerScope | null;
	loadInventoryItems: LoadInventoryItems;
};

const quantityFormatter = new Intl.NumberFormat("ja-JP", {
	maximumFractionDigits: 6,
});

export function InventoryList({
	ownerScope,
	loadInventoryItems,
}: InventoryListProps) {
	const [items, setItems] = useState<InventoryListItem[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const loadItems = useCallback(async () => {
		if (!ownerScope || ownerScope === "guest") {
			setItems([]);
			setErrorMessage(null);
			return;
		}

		setIsLoading(true);
		setErrorMessage(null);

		try {
			setItems(await loadInventoryItems());
		} catch {
			setErrorMessage("在庫を読み込めませんでした");
		} finally {
			setIsLoading(false);
		}
	}, [ownerScope, loadInventoryItems]);

	useEffect(() => {
		void loadItems();
	}, [loadItems]);

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
							<span className={styles.itemName}>{item.name}</span>

							<span className={styles.quantity}>
								{item.trackingMode === "estimated" ? "約 " : ""}
								{quantityFormatter.format(item.quantity)}
								{item.stockUnitLabel}
							</span>
						</li>
					))}
				</ul>
			) : null}
		</section>
	);
}
