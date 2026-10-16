import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { type ReactNode, type Ref, useState } from "react";
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
import type { ParsedShoppingMemoLine } from "../domain/parse-shopping-memo";
import { groupShoppingItemsByCategory } from "../domain/shopping-category-group";
import { type ShoppingItem, toggleShoppingItem } from "../domain/shopping-item";
import { inferShoppingCategory } from "../domain/shopping-item-suggestion";
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
import {
	ShoppingBranchCards,
	type ShoppingBranchCardsContext,
} from "./shopping-branch-cards";
import { ShoppingBranchCreate } from "./shopping-branch-create";
import { ShoppingBulkAdd } from "./shopping-bulk-add";
import { ShoppingItemEditForm } from "./shopping-item-edit-form";
import { ShoppingItemForm } from "./shopping-item-form";
import { ShoppingItemInventoryConversionForm } from "./shopping-item-inventory-conversion-form";
import { ShoppingItemRow } from "./shopping-item-row";
import * as styles from "./shopping-page.css";
import { ShoppingPurchasedSection } from "./shopping-purchased-section";
import { ShoppingQuantitySheet } from "./shopping-quantity-sheet";
import { ShoppingStoreManager } from "./shopping-store-manager";
import {
	type DragHandleRef,
	SortableShoppingItem,
	shoppingSortSensors,
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
	// 見出しの下に出すお知らせ（在庫への同期・ゲスト購入の引き継ぎなど）。
	notices?: ReactNode;
};

export function ShoppingList({
	repository = dexieShoppingRepository,
	storeRepository = dexieShoppingStoreRepository,
	branchRepository = dexieShoppingBranchRepository,
	confirmPurchases = defaultConfirmPurchases,
	syncPurchases,
	ownerScope = "guest",
	renderRecipePicker,
	notices,
}: ShoppingListProps) {
	const shopping = useShoppingItems(repository);
	const { items, isLoading, isReordering, errorMessage, setErrorMessage } =
		shopping;
	const [editingItemId, setEditingItemId] = useState<string | null>(null);
	const [view, setView] = useStorageItem(shoppingViewStorage);
	const [isPickingRecipe, setIsPickingRecipe] = useState(false);
	const [isBulkAdding, setIsBulkAdding] = useState(false);
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

	// 「まとめて追加」で確認した行を、順に追加する（途中で失敗したら、そこで止める）。店を指定した行は、食材ごとの「いつも買う店」にも覚える。
	async function addMemoLines(lines: readonly ParsedShoppingMemoLine[]) {
		let added = 0;

		for (const line of lines) {
			// カテゴリは、食材のカタログから推定する（追加フォームと同じ。決められなければ、未設定）。
			const categoryId = inferShoppingCategory(line.name);
			const ok = await shopping.addItem({
				categoryId,
				categoryAssignment: categoryId ? "automatic" : null,
				name: line.name,
				quantity: line.quantity,
				unitLabel: line.unitLabel,
				storeId: line.storeId,
			});

			if (!ok) {
				break;
			}

			if (line.storeId) {
				await storeState.rememberStore(line.name, line.storeId);
			}

			added += 1;
		}

		return added;
	}

	const branchContext: ShoppingBranchCardsContext = {
		items: shopping.allItems,
		stores,
		defaultStoreIdFor: storeState.defaultStoreIdFor,
		onCreateStore: storeState.addStore,
		onRemoveBranch: branchState.removeBranch,
		onDecide: branchState.decideBranch,
		onAddItem: async (branch, side, input) => {
			const added = await shopping.addItem({
				...input,
				branchId: branch.id,
				branchSide: side,
			});

			if (added) {
				await storeState.rememberStore(input.name, input.storeId ?? null);
			}

			return added;
		},
		onRemoveItem: shopping.removeItem,
		repository,
		renderRecipePicker,
		onRecipeApplied: (branch, side, recipeName) => {
			void branchState.labelSideIfEmpty(branch.id, side, recipeName);
			void reloadItems();
		},
	};
	const branches = branchState.branches;
	// 購入済みは、1か所にまとめる（普段は閉じている）。
	const activeItems = items.filter((item) => item.status !== "purchased");
	const purchasedItems = items.filter((item) => item.status === "purchased");
	// 分類の見出しは出さない。同じ分類の項目が続く並びを、1つのカードに入れる（並べ替えは、同じ分類の中）。
	const categoryGroups = groupShoppingItemsByCategory(activeItems);

	const storeGroups = groupShoppingItemsByStore(
		currentStoreId
			? activeItems.filter(
					(item) => !item.storeId || item.storeId === currentStoreId,
				)
			: activeItems,
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
						disabled={activeItems.length < 2 || isReordering}
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
								disabled={activeItems.length < 2 || isReordering}
							/>
						)}
					/>
				</div>
			</div>

			{notices ? <div className={styles.notices}>{notices}</div> : null}

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

			<div className={styles.entryRow}>
				<Button
					variant="secondary"
					size="sm"
					align="start"
					leadingIcon={<Icon name="rows" size={20} />}
					onClick={() => setIsBulkAdding(true)}
				>
					まとめて追加
				</Button>

				{renderRecipePicker ? (
					<Button
						variant="secondary"
						size="sm"
						align="start"
						leadingIcon={<Icon name="book" size={20} />}
						onClick={() => setIsPickingRecipe(true)}
					>
						レシピから入れる
					</Button>
				) : null}
			</div>

			{isBulkAdding ? (
				<ShoppingBulkAdd
					stores={stores}
					onClose={() => setIsBulkAdding(false)}
					onAdd={addMemoLines}
					onCreateStore={storeState.addStore}
				/>
			) : null}

			{renderRecipePicker && isPickingRecipe
				? renderRecipePicker({
						repository,
						onClose: () => setIsPickingRecipe(false),
						onApplied: () => void reloadItems(),
					})
				: null}

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

			{isLoading ? (
				<div className={styles.center}>
					<Mascot size={56} />
					<p className={styles.centerText}>読み込んでいます…</p>
				</div>
			) : null}

			{!isLoading && activeItems.length === 0 && branches.length === 0 ? (
				<div className={styles.center}>
					<Mascot size={64} motion="still" />
					<p className={styles.centerText}>買うものはまだありません。</p>
				</div>
			) : null}

			{!isLoading && view === "store" ? (
				<ShoppingStoreManager
					stores={stores}
					onAdd={storeState.addStore}
					onRename={storeState.renameStore}
					onRemove={storeState.removeStore}
				/>
			) : null}

			{!isLoading && items.length > 0 && view === "store" ? (
				<>
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
				</>
			) : null}

			{!isLoading && view === "store" && branches.length > 0 ? (
				<div className={styles.categoryCard}>
					<ShoppingBranchCards branches={branches} context={branchContext} />
				</div>
			) : null}

			{!isLoading && items.length > 0 && view === "store" ? (
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
			) : null}

			{!isLoading &&
			view === "aisle" &&
			(activeItems.length > 0 || branches.length > 0) ? (
				<div className={styles.categoryCard}>
					<ShoppingBranchCards branches={branches} context={branchContext} />

					{categoryGroups.map((group) => (
						<DragDropProvider
							key={group.categoryId ?? "uncategorized"}
							sensors={shoppingSortSensors}
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
							<ul className={styles.rowList}>
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
					))}
				</div>
			) : null}

			{isLoading ? null : (
				<ShoppingPurchasedSection
					items={purchasedItems}
					renderItem={(item) => renderItem(item)}
					onClear={async (targets) => {
						for (const target of targets) {
							await shopping.removeItem(target.id);
						}
					}}
				/>
			)}

			{isLoading ? null : (
				<ShoppingBranchCreate
					stores={stores}
					defaultStoreIdFor={storeState.defaultStoreIdFor}
					onCreateStore={storeState.addStore}
					onAddBranch={branchState.addBranch}
				/>
			)}

			<div className={styles.purchaseBar}>
				<Button
					size="lg"
					fullWidth
					status={purchase.isConfirmingPurchase ? "pending" : "idle"}
					pendingLabel="購入確定中"
					aria-label={`購入を確定（${purchase.checkedItemCount}件）`}
					disabled={
						purchase.checkedItemCount === 0 || isLoading || ownerScope === null
					}
					disabledReason={
						purchase.checkedItemCount === 0
							? "買ったものにチェックを入れてください"
							: undefined
					}
					onClick={purchase.requestPurchase}
				>
					購入を確定
					<span className={styles.purchaseCount}>
						{purchase.checkedItemCount}
					</span>
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
