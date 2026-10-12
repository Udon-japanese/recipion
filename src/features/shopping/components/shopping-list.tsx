import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import clsx from "clsx";
import { useState } from "react";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import type { ShoppingRepository } from "../application/shopping-repository";
import { toggleShoppingItem } from "../domain/shopping-item";
import { useShoppingItems } from "../hooks/use-shopping-items";
import {
	type ConfirmPurchases,
	type SyncPurchases,
	useShoppingPurchase,
} from "../hooks/use-shopping-purchase";
import { confirmCheckedShoppingItemsPurchase } from "../infrastructure/dexie-shopping-purchase";
import { dexieShoppingRepository } from "../infrastructure/dexie-shopping-repository";
import { PurchaseExpiryReview } from "./purchase-expiry-review";
import { ShoppingItemEditForm } from "./shopping-item-edit-form";
import { ShoppingItemForm } from "./shopping-item-form";
import { ShoppingItemInventoryConversionForm } from "./shopping-item-inventory-conversion-form";
import { ShoppingItemRow } from "./shopping-item-row";
import * as styles from "./shopping-list.css";
import { SortableShoppingItem } from "./sortable-shopping-item";

// 既定の購入確定（ローカルの DB に保存する）。期限・保存方法のオプションを渡せるようにする。
const defaultConfirmPurchases: ConfirmPurchases = (ownerScope, options) =>
	confirmCheckedShoppingItemsPurchase(
		ownerScope,
		undefined,
		undefined,
		options,
	);

type ShoppingListProps = {
	repository?: ShoppingRepository;
	confirmPurchases?: ConfirmPurchases;
	syncPurchases?: SyncPurchases;
	ownerScope?: InventoryPurchaseOwnerScope | null;
};

export function ShoppingList({
	repository = dexieShoppingRepository,
	confirmPurchases = defaultConfirmPurchases,
	syncPurchases,
	ownerScope = "guest",
}: ShoppingListProps) {
	const shopping = useShoppingItems(repository);
	const { items, isLoading, isReordering, errorMessage, setErrorMessage } =
		shopping;
	const [editingItemId, setEditingItemId] = useState<string | null>(null);

	const purchase = useShoppingPurchase({
		items,
		ownerScope,
		confirmPurchases,
		syncPurchases,
		setErrorMessage,
		applyPurchasedItems: (purchasedItems) => {
			const purchasedItemsById = new Map(
				purchasedItems.map((item) => [item.id, item]),
			);

			for (const purchasedItem of purchasedItemsById.values()) {
				shopping.replaceItem(purchasedItem);
			}
		},
		saveConversion: shopping.changeItem,
	});

	return (
		<main className={styles.container}>
			<h1 className={styles.title}>買い物メモ</h1>

			<div className={styles.toolbar}>
				<button
					className={styles.sortButton}
					type="button"
					disabled={items.length < 2 || isReordering}
					onClick={() => void shopping.sortByCategory("forward")}
				>
					売り場順
				</button>

				<button
					className={styles.sortButton}
					type="button"
					disabled={items.length < 2 || isReordering}
					onClick={() => void shopping.sortByCategory("reverse")}
				>
					逆回り
				</button>
			</div>

			<ShoppingItemForm onAdd={shopping.addItem} errorMessage={errorMessage} />

			{purchase.conversionItem ? (
				<ShoppingItemInventoryConversionForm
					item={purchase.conversionItem}
					isSaving={purchase.isSavingConversion}
					onSave={(configuration) =>
						purchase.conversionItem
							? purchase.saveInventoryConfiguration(
									purchase.conversionItem,
									configuration,
								)
							: Promise.resolve()
					}
					onCancel={purchase.cancelConversion}
				/>
			) : null}

			{purchase.isReviewingExpiry ? (
				<PurchaseExpiryReview
					items={purchase.checkedTrackedItems}
					values={purchase.expiryValues}
					onChangeValue={(itemId, value) =>
						purchase.setExpiryValues((current) => ({
							...current,
							[itemId]: value,
						}))
					}
					today={purchase.today}
					estimateLevel={purchase.expiryEstimateLevel}
					onChangeEstimateLevel={purchase.changeEstimateLevel}
					isConfirming={purchase.isConfirmingPurchase}
					onConfirm={purchase.confirmWithExpiry}
					onCancel={purchase.cancelExpiryReview}
				/>
			) : null}

			<div className={styles.purchaseActions}>
				<button
					className={styles.purchaseButton}
					type="button"
					disabled={
						purchase.checkedItemCount === 0 ||
						purchase.isConfirmingPurchase ||
						isLoading ||
						ownerScope === null
					}
					onClick={purchase.requestPurchase}
				>
					{purchase.isConfirmingPurchase
						? "購入確定中…"
						: `チェック済みを購入確定（${purchase.checkedItemCount}件）`}
				</button>
			</div>

			{isLoading ? <p className={styles.message}>読み込んでいます…</p> : null}

			{!isLoading && items.length === 0 ? (
				<p className={styles.message}>買うものはまだありません。</p>
			) : null}

			{!isLoading && items.length > 0 ? (
				<DragDropProvider
					onDragEnd={(event) => {
						if (event.canceled) {
							return;
						}

						const { source } = event.operation;

						if (!isSortable(source)) {
							return;
						}

						void shopping.dragMove(source.initialIndex, source.index);
					}}
				>
					<ul className={styles.list}>
						{items.map((item, index) => {
							const isChecked =
								item.status === "checked" || item.status === "purchased";

							return (
								<SortableShoppingItem
									id={item.id}
									index={index}
									className={clsx(styles.item, isChecked && styles.checkedItem)}
									disabled={isReordering || editingItemId === item.id}
									key={item.id}
								>
									{(dragHandleRef) =>
										editingItemId === item.id ? (
											<ShoppingItemEditForm
												item={item}
												onCancel={() => setEditingItemId(null)}
												onSave={async (target, input) => {
													const updated = await shopping.updateItem(
														target,
														input,
													);

													if (updated) {
														setEditingItemId(null);
													}

													return updated !== null;
												}}
											/>
										) : (
											<ShoppingItemRow
												item={item}
												dragHandleRef={dragHandleRef}
												isFirst={index === 0}
												isLast={index === items.length - 1}
												isReordering={isReordering}
												onToggle={(target) =>
													void shopping.changeItem(() =>
														toggleShoppingItem(target),
													)
												}
												onMove={(itemId, direction) =>
													void shopping.moveItem(itemId, direction)
												}
												onStartEditing={(target) => {
													setErrorMessage(null);
													setEditingItemId(target.id);
												}}
												onRemove={(itemId) => void shopping.removeItem(itemId)}
											/>
										)
									}
								</SortableShoppingItem>
							);
						})}
					</ul>
				</DragDropProvider>
			) : null}
		</main>
	);
}
