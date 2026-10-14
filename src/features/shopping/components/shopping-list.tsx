import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import clsx from "clsx";
import { useState } from "react";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { useStorageItem } from "#/local-storage/use-storage-item";
import { PickerSelect } from "../../../components/select/picker-select";
import type { ShoppingBranchRepository } from "../application/shopping-branch-repository";
import type { ShoppingRepository } from "../application/shopping-repository";
import type { ShoppingStoreRepository } from "../application/shopping-store-repository";
import { type ShoppingItem, toggleShoppingItem } from "../domain/shopping-item";
import { groupShoppingItemsByStore } from "../domain/shopping-store";
import { useShoppingBranches } from "../hooks/use-shopping-branches";
import { useShoppingItems } from "../hooks/use-shopping-items";
import {
	type ConfirmPurchases,
	type SyncPurchases,
	useShoppingPurchase,
} from "../hooks/use-shopping-purchase";
import { useShoppingStores } from "../hooks/use-shopping-stores";
import { dexieShoppingBranchRepository } from "../infrastructure/dexie-shopping-branch-repository";
import { confirmCheckedShoppingItemsPurchase } from "../infrastructure/dexie-shopping-purchase";
import { dexieShoppingRepository } from "../infrastructure/dexie-shopping-repository";
import { dexieShoppingStoreRepository } from "../infrastructure/dexie-shopping-store-repository";
import { shoppingViewStorage } from "../infrastructure/shopping-view-storage";
import { PurchaseExpiryReview } from "./purchase-expiry-review";
import type { RenderRecipePicker } from "./recipe-picker-slot";
import { ShoppingBranchSection } from "./shopping-branch-section";
import { ShoppingItemEditForm } from "./shopping-item-edit-form";
import { ShoppingItemForm } from "./shopping-item-form";
import { ShoppingItemInventoryConversionForm } from "./shopping-item-inventory-conversion-form";
import { ShoppingItemRow } from "./shopping-item-row";
import * as styles from "./shopping-list.css";
import { ShoppingStoreManager } from "./shopping-store-manager";
import {
	type DragHandleRef,
	SortableShoppingItem,
} from "./sortable-shopping-item";

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
	storeRepository?: ShoppingStoreRepository;
	branchRepository?: ShoppingBranchRepository;
	confirmPurchases?: ConfirmPurchases;
	syncPurchases?: SyncPurchases;
	ownerScope?: InventoryPurchaseOwnerScope | null;
	// 「レシピから入れる」の部品。渡されたとき（ログイン中）だけ、ボタンを出す。
	renderRecipePicker?: RenderRecipePicker;
};

export function ShoppingList({
	repository = dexieShoppingRepository,
	storeRepository = dexieShoppingStoreRepository,
	branchRepository = dexieShoppingBranchRepository,
	confirmPurchases = defaultConfirmPurchases,
	syncPurchases,
	ownerScope = "guest",
	renderRecipePicker,
}: ShoppingListProps) {
	const shopping = useShoppingItems(repository);
	const { items, isLoading, isReordering, errorMessage, setErrorMessage } =
		shopping;
	const [editingItemId, setEditingItemId] = useState<string | null>(null);
	const [view, setView] = useStorageItem(shoppingViewStorage);
	const [isPickingRecipe, setIsPickingRecipe] = useState(false);

	// レシピの材料を入れたあと、保存済みの一覧を読み直す（購読できない保存先でも、画面に反映する）。
	async function reloadItems() {
		try {
			shopping.setItems(await repository.list());
		} catch {
			setErrorMessage("買い物メモを読み込めませんでした");
		}
	}
	// 店ごとの表示で、今いる店（その店と「どこでも」の項目だけを出す）。null はすべて。
	const [currentStoreId, setCurrentStoreId] = useState<string | null>(null);
	function handleStoreRemoved(storeId: string) {
		shopping.clearStore(storeId);
		setCurrentStoreId((current) => (current === storeId ? null : current));
	}

	const storeState = useShoppingStores({
		repository: storeRepository,
		onError: setErrorMessage,
		onStoreRemoved: handleStoreRemoved,
	});
	const { stores } = storeState;
	const branchState = useShoppingBranches({
		repository: branchRepository,
		allItems: shopping.allItems,
		setItems: shopping.setItems,
		onError: setErrorMessage,
	});
	const storeNamesById = new Map(stores.map((store) => [store.id, store.name]));

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

	// 1 項目の中身（編集中は編集フォーム）。一覧（並び替えあり）と店ごと（並び替えなし）で共通。
	function renderItem(
		item: ShoppingItem,
		dragHandleRef: DragHandleRef | undefined,
		index = 0,
	) {
		if (editingItemId === item.id) {
			return (
				<ShoppingItemEditForm
					item={item}
					stores={stores}
					onCreateStore={storeState.addStore}
					onCancel={() => setEditingItemId(null)}
					onSave={async (target, input) => {
						const updated = await shopping.updateItem(target, input);

						if (updated) {
							await storeState.rememberStore(updated.name, updated.storeId);
							setEditingItemId(null);
						}

						return updated !== null;
					}}
				/>
			);
		}

		return (
			<ShoppingItemRow
				item={item}
				dragHandleRef={dragHandleRef}
				storeName={
					dragHandleRef && item.storeId
						? storeNamesById.get(item.storeId)
						: undefined
				}
				isFirst={index === 0}
				isLast={index === items.length - 1}
				isReordering={isReordering}
				onToggle={(target) =>
					void shopping.changeItem(() => toggleShoppingItem(target))
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
		);
	}

	return (
		<main className={styles.container}>
			<h1 className={styles.title}>買い物メモ</h1>

			<div className={styles.toolbar}>
				<div className={styles.viewToggle}>
					<button
						className={clsx(styles.sortButton, styles.pressedButton)}
						type="button"
						aria-pressed={view === "aisle"}
						onClick={() => setView("aisle")}
					>
						一覧
					</button>

					<button
						className={clsx(styles.sortButton, styles.pressedButton)}
						type="button"
						aria-pressed={view === "store"}
						onClick={() => setView("store")}
					>
						店ごと
					</button>
				</div>

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

			<ShoppingItemForm
				onAdd={async (input) => {
					const added = await shopping.addItem(input);

					if (added) {
						await storeState.rememberStore(input.name, input.storeId ?? null);
					}

					return added;
				}}
				errorMessage={errorMessage}
				stores={stores}
				defaultStoreIdFor={storeState.defaultStoreIdFor}
				onCreateStore={storeState.addStore}
			/>

			{renderRecipePicker ? (
				isPickingRecipe ? (
					renderRecipePicker({
						repository,
						onClose: () => setIsPickingRecipe(false),
						onApplied: () => void reloadItems(),
					})
				) : (
					<button
						className={styles.sortButton}
						type="button"
						onClick={() => setIsPickingRecipe(true)}
					>
						レシピから入れる
					</button>
				)
			) : null}

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

			<ShoppingBranchSection
				branches={branchState.branches}
				items={shopping.allItems}
				stores={stores}
				defaultStoreIdFor={storeState.defaultStoreIdFor}
				onCreateStore={storeState.addStore}
				onAddBranch={branchState.addBranch}
				onRemoveBranch={branchState.removeBranch}
				onDecide={branchState.decideBranch}
				onAddItem={async (branch, side, input) => {
					const added = await shopping.addItem({
						...input,
						branchId: branch.id,
						branchSide: side,
					});

					if (added) {
						await storeState.rememberStore(input.name, input.storeId ?? null);
					}

					return added;
				}}
				onRemoveItem={shopping.removeItem}
				repository={repository}
				renderRecipePicker={renderRecipePicker}
				onRecipeApplied={(branch, side, recipeName) => {
					void branchState.labelSideIfEmpty(branch.id, side, recipeName);
					void reloadItems();
				}}
			/>

			{isLoading ? <p className={styles.message}>読み込んでいます…</p> : null}

			{!isLoading && items.length === 0 ? (
				<p className={styles.message}>買うものはまだありません。</p>
			) : null}

			{!isLoading && items.length > 0 && view === "store" ? (
				<>
					<ShoppingStoreManager
						stores={stores}
						onRename={storeState.renameStore}
						onRemove={storeState.removeStore}
					/>

					{stores.length > 0 ? (
						<div className={styles.storeFilter}>
							<label htmlFor="shopping-current-store">今いる店</label>

							<PickerSelect
								className={styles.input}
								id="shopping-current-store"
								value={currentStoreId ?? ""}
								onChange={(event) =>
									setCurrentStoreId(
										event.target.value === "" ? null : event.target.value,
									)
								}
							>
								<option value="">すべての店</option>

								{stores.map((store) => (
									<option value={store.id} key={store.id}>
										{store.name}
									</option>
								))}
							</PickerSelect>
						</div>
					) : null}

					{groupShoppingItemsByStore(
						currentStoreId
							? items.filter(
									(item) => !item.storeId || item.storeId === currentStoreId,
								)
							: items,
						stores,
					).map((group) => (
						<section
							className={styles.storeGroup}
							key={group.store?.id ?? "anywhere"}
						>
							<h2 className={styles.storeGroupTitle}>
								{group.store?.name ?? "どこでも"}
							</h2>

							<ul className={styles.list}>
								{group.items.map((item) => (
									<li
										className={clsx(
											styles.item,
											styles.itemWithoutHandle,
											(item.status === "checked" ||
												item.status === "purchased") &&
												styles.checkedItem,
										)}
										key={item.id}
									>
										{renderItem(item, undefined)}
									</li>
								))}
							</ul>
						</section>
					))}
				</>
			) : null}

			{!isLoading && items.length > 0 && view === "aisle" ? (
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
									{(dragHandleRef) => renderItem(item, dragHandleRef, index)}
								</SortableShoppingItem>
							);
						})}
					</ul>
				</DragDropProvider>
			) : null}
		</main>
	);
}
