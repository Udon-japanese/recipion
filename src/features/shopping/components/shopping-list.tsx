import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { type Ref, useState } from "react";
import { Button } from "#/components/button/button";
import { Field, SelectBox } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import { IconButton } from "#/components/icon-button/icon-button";
import { Mascot } from "#/components/mascot/mascot";
import { Menu } from "#/components/menu/menu";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { Tag } from "#/components/tag/tag";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { useStorageItem } from "#/local-storage/use-storage-item";
import type { ShoppingBranchRepository } from "../application/shopping-branch-repository";
import type { ShoppingRepository } from "../application/shopping-repository";
import type { ShoppingStoreRepository } from "../application/shopping-store-repository";
import { groupShoppingItemsByCategory } from "../domain/shopping-category-group";
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
import * as styles from "./shopping-page.css";
import { ShoppingQuantitySheet } from "./shopping-quantity-sheet";
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
	// 数量だけを直すシートの項目。
	const [quantityItem, setQuantityItem] = useState<ShoppingItem | null>(null);

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
		position: {
			rowRef?: Ref<HTMLLIElement>;
			dragHandleRef?: DragHandleRef;
			isDragging?: boolean;
			isFirst?: boolean;
			isLast?: boolean;
		} = {},
	) {
		if (editingItemId === item.id) {
			return (
				<li className={styles.editRow} ref={position.rowRef} key={item.id}>
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
				</li>
			);
		}

		return (
			<ShoppingItemRow
				item={item}
				key={item.id}
				rowRef={position.rowRef}
				dragHandleRef={position.dragHandleRef}
				isDragging={position.isDragging}
				storeName={
					position.dragHandleRef && item.storeId
						? storeNamesById.get(item.storeId)
						: undefined
				}
				isFirst={position.isFirst ?? true}
				isLast={position.isLast ?? true}
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
				onEditQuantity={setQuantityItem}
				onRemove={(itemId) => void shopping.removeItem(itemId)}
			/>
		);
	}

	const storeGroups = groupShoppingItemsByStore(
		currentStoreId
			? items.filter((item) => !item.storeId || item.storeId === currentStoreId)
			: items,
		stores,
	);

	return (
		<main className={styles.page}>
			<div className={styles.titleRow}>
				<h1 className={styles.title}>買い物メモ</h1>

				<div className={styles.toolbar}>
					<div className={styles.toolbarSegment}>
						<SegmentedControl
							label="表示の切り替え"
							value={view}
							onChange={setView}
							options={[
								{ value: "aisle", label: "一覧", icon: "list" },
								{ value: "store", label: "店ごと", icon: "store" },
							]}
						/>
					</div>

					<Menu
						label="並べ替え"
						icon="swap"
						disabled={items.length < 2 || isReordering}
						items={[
							{
								label: "売り場順",
								icon: "arrow-down",
								onSelect: () => void shopping.sortByCategory("forward"),
							},
							{
								label: "逆回り",
								icon: "arrow-up",
								onSelect: () => void shopping.sortByCategory("reverse"),
							},
						]}
						trigger={(props) => (
							<IconButton
								{...props}
								icon="swap"
								label="並べ替え"
								size="std"
								disabled={items.length < 2 || isReordering}
							/>
						)}
					/>
				</div>
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
					<Button
						variant="secondary"
						size="sm"
						align="start"
						leadingIcon={<Icon name="book" size={20} />}
						onClick={() => setIsPickingRecipe(true)}
					>
						レシピから入れる
					</Button>
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

			{isLoading ? (
				<div className={styles.center}>
					<Mascot size={56} />
					<p className={styles.centerText}>読み込んでいます…</p>
				</div>
			) : null}

			{!isLoading && items.length === 0 ? (
				<div className={styles.center}>
					<Mascot size={64} motion="still" />
					<p className={styles.centerText}>買うものはまだありません。</p>
				</div>
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
							<Field label="今いる店">
								{(control) => (
									<SelectBox
										id={control.id}
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
									</SelectBox>
								)}
							</Field>
						</div>
					) : null}

					<div className={styles.groups}>
						{storeGroups.map((group) => (
							<section key={group.store?.id ?? "anywhere"}>
								<div className={styles.groupHeader}>
									<h2 className={styles.groupTitle}>
										{group.store?.name ?? "どこでも"}
									</h2>

									<Tag>
										残り{" "}
										{
											group.items.filter((item) => item.status === "pending")
												.length
										}
									</Tag>
								</div>

								<ul className={styles.listCard}>
									{group.items.map((item) => renderItem(item))}
								</ul>
							</section>
						))}
					</div>
				</>
			) : null}

			{!isLoading && items.length > 0 && view === "aisle" ? (
				<div className={styles.groups}>
					{groupShoppingItemsByCategory(items).map((group) => (
						<section key={group.categoryId ?? "uncategorized"}>
							<div className={styles.groupHeader}>
								<h2 className={styles.groupTitle}>{group.label}</h2>

								<Tag>残り {group.remaining}</Tag>
							</div>

							<DragDropProvider
								onDragEnd={(event) => {
									if (event.canceled) {
										return;
									}

									const { source } = event.operation;

									if (!isSortable(source)) {
										return;
									}

									void shopping.dragMove(
										group.categoryId,
										source.initialIndex,
										source.index,
									);
								}}
							>
								<ul className={styles.listCard}>
									{group.items.map((item, index) => (
										<SortableShoppingItem
											id={item.id}
											index={index}
											disabled={isReordering || editingItemId === item.id}
											key={item.id}
										>
											{({ rowRef, handleRef, isDragging }) =>
												renderItem(item, {
													rowRef,
													dragHandleRef: handleRef,
													isDragging,
													isFirst: index === 0,
													isLast: index === group.items.length - 1,
												})
											}
										</SortableShoppingItem>
									))}
								</ul>
							</DragDropProvider>
						</section>
					))}
				</div>
			) : null}

			<div className={styles.purchaseBar}>
				<Button
					size="lg"
					fullWidth
					aria-label={`購入を確定（${purchase.checkedItemCount}件）`}
					disabled={
						purchase.checkedItemCount === 0 ||
						purchase.isConfirmingPurchase ||
						isLoading ||
						ownerScope === null
					}
					onClick={purchase.requestPurchase}
				>
					{purchase.isConfirmingPurchase ? (
						"購入確定中…"
					) : (
						<>
							購入を確定
							<span className={styles.purchaseCount}>
								{purchase.checkedItemCount}
							</span>
						</>
					)}
				</Button>
			</div>

			<ShoppingQuantitySheet
				item={quantityItem}
				onClose={() => setQuantityItem(null)}
				onSave={async (target, quantity) => {
					const updated = await shopping.updateItem(target, {
						name: target.name,
						quantity,
						unitLabel: target.unitLabel,
					});

					return updated !== null;
				}}
			/>
		</main>
	);
}
