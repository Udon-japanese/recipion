import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { type ReactNode, type Ref, useState } from "react";
import { Button } from "#/components/button/button";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
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
import type { ShoppingConversionDefaultRepository } from "../application/shopping-conversion-default-repository";
import type { ShoppingRepository } from "../application/shopping-repository";
import type { ShoppingStoreRepository } from "../application/shopping-store-repository";
import type { ParsedShoppingMemoLine } from "../domain/parse-shopping-memo";
import {
	getShoppingBranchConditionItem,
	type ShoppingBranchSide,
} from "../domain/shopping-branch";
import { describeConversionDefault } from "../domain/shopping-conversion-default";
import { type ShoppingItem, toggleShoppingItem } from "../domain/shopping-item";
import { inferShoppingCategory } from "../domain/shopping-item-suggestion";
import { groupShoppingByStore } from "../domain/shopping-store";
import { useShoppingBranches } from "../hooks/use-shopping-branches";
import { useShoppingConversionDefaults } from "../hooks/use-shopping-conversion-defaults";
import { useShoppingItems } from "../hooks/use-shopping-items";
import {
	type ConfirmPurchases,
	type SyncPurchases,
	useShoppingPurchase,
} from "../hooks/use-shopping-purchase";
import { useShoppingStores } from "../hooks/use-shopping-stores";
import { dexieShoppingBranchRepository } from "../infrastructure/dexie-shopping-branch-repository";
import { dexieShoppingConversionDefaultRepository } from "../infrastructure/dexie-shopping-conversion-default-repository";
import { confirmCheckedShoppingItemsPurchase } from "../infrastructure/dexie-shopping-purchase";
import { dexieShoppingRepository } from "../infrastructure/dexie-shopping-repository";
import { dexieShoppingStoreRepository } from "../infrastructure/dexie-shopping-store-repository";
import { shoppingViewStorage } from "../infrastructure/shopping-view-storage";
import { PurchaseExpiryReview } from "./purchase-expiry-review";
import type { RenderRecipePicker } from "./recipe-picker-slot";
import { ShoppingAddSheet } from "./shopping-add-sheet";
import {
	ShoppingBranchCards,
	type ShoppingBranchCardsContext,
} from "./shopping-branch-cards";
import { ShoppingBranchCreate } from "./shopping-branch-create";
import { ShoppingBulkAdd } from "./shopping-bulk-add";
import { ShoppingItemEditForm } from "./shopping-item-edit-form";
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
	conversionDefaultRepository?: ShoppingConversionDefaultRepository;
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
	conversionDefaultRepository = dexieShoppingConversionDefaultRepository,
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
	const [isAddingItem, setIsAddingItem] = useState(false);
	const [isCreatingBranch, setIsCreatingBranch] = useState(false);
	// 数量だけを直すシートの項目。
	const [quantityItem, setQuantityItem] = useState<ShoppingItem | null>(null);
	// 在庫への換算を直している項目（行の換算を押したとき）。
	const [conversionEditItem, setConversionEditItem] =
		useState<ShoppingItem | null>(null);
	const [isSavingConversionEdit, setIsSavingConversionEdit] = useState(false);

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
	const conversionState = useShoppingConversionDefaults({
		repository: conversionDefaultRepository,
	});
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
		conversionMemory: conversionState,
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
				onEditConversion={setConversionEditItem}
				onRemove={(itemId) => void shopping.removeItem(itemId)}
			/>
		);
	}

	// 「まとめて追加」で確認した行を、順に追加する（途中で失敗したら、そこで止める）。店を指定した行は、食材ごとの「いつも買う店」にも覚える。
	// destination を渡すと、条件つきのメモの、その側に入れる。
	async function addMemoLines(
		lines: readonly ParsedShoppingMemoLine[],
		destination?: { branchId: string; side: ShoppingBranchSide },
	) {
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
				inventoryConversion: line.inventoryConversion,
				storeId: line.storeId,
				...(destination
					? { branchId: destination.branchId, branchSide: destination.side }
					: {}),
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
		conversionDefaults: conversionState.defaults,
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
		onAddItems: (branch, side, lines) =>
			addMemoLines(lines, { branchId: branch.id, side }),
		onRemoveItem: shopping.removeItem,
		onUpdateBranch: branchState.updateBranch,
		onUpdateItem: shopping.updateItem,
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
	// 分類の見出しは出さない。並び順のまま、1つの一覧にする（ドラッグでも、上下でも、分類をまたいで動かせる）。
	// 「売り場順」を押すと、分類ごとに並べ直す。
	const listedItems = [...activeItems].sort(
		(left, right) => left.sortOrder - right.sortOrder,
	);

	// 条件つきのメモは、条件の材料の店で、店ごとに分ける。
	const branchPlacements = branches.map((branch) => ({
		branch,
		storeId:
			getShoppingBranchConditionItem(shopping.allItems, branch.id)?.storeId ??
			null,
	}));
	// 今いる店：その店と、店の決まっていない（「どこでも」）ものだけ。項目の順番は、一覧の並び順のまま。
	const isForCurrentStore = (storeId: string | null) =>
		!currentStoreId || !storeId || storeId === currentStoreId;
	const storeGroups = groupShoppingByStore(
		listedItems.filter((item) => isForCurrentStore(item.storeId)),
		branchPlacements.filter((placement) =>
			isForCurrentStore(placement.storeId),
		),
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

			{/* 追加のシートを開いているときは、シートの中に出す。 */}
			{errorMessage && !isAddingItem ? (
				<p className={styles.formError} role="alert">
					<Icon name="alert-triangle" size={20} />
					{errorMessage}
				</p>
			) : null}

			{isAddingItem ? (
				<ShoppingAddSheet
					title="買うものを入れる"
					errorMessage={errorMessage}
					stores={stores}
					defaultStoreIdFor={storeState.defaultStoreIdFor}
					onCreateStore={storeState.addStore}
					onClose={() => setIsAddingItem(false)}
					onAdd={async (input) => {
						const added = await shopping.addItem(input);

						if (added) {
							await storeState.rememberStore(input.name, input.storeId ?? null);
						}

						return added;
					}}
				/>
			) : null}

			{isCreatingBranch ? (
				<ShoppingBranchCreate
					stores={stores}
					onCreateStore={storeState.addStore}
					onAddBranch={branchState.addBranch}
					onClose={() => setIsCreatingBranch(false)}
				/>
			) : null}

			{isBulkAdding ? (
				<ShoppingBulkAdd
					stores={stores}
					conversionDefaults={conversionState.defaults}
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

			{purchase.overwriteRequest ? (
				<ConfirmDialog
					open
					title={`${purchase.overwriteRequest.itemName}のいつもの換算を変えますか`}
					cancelLabel="今回だけ"
					confirmLabel="変える"
					pending={purchase.isConfirmingPurchase}
					onCancel={() => void purchase.answerConversionOverwrite("once")}
					onConfirm={() => void purchase.answerConversionOverwrite("replace")}
				>
					いつもの換算は「
					{describeConversionDefault(purchase.overwriteRequest.previous)}
					」です。今回の設定は「
					{describeConversionDefault(purchase.overwriteRequest.next)}
					」です。
				</ConfirmDialog>
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

			{!isLoading &&
			(items.length > 0 || branches.length > 0) &&
			view === "store" ? (
				stores.length > 0 ? (
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
				) : null
			) : null}

			{!isLoading &&
			(activeItems.length > 0 || branches.length > 0) &&
			view === "store" ? (
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

							{group.branches.length > 0 ? (
								<div className={styles.categoryCard}>
									<ShoppingBranchCards
										branches={group.branches}
										context={branchContext}
									/>
								</div>
							) : null}

							{group.items.length > 0 ? (
								<ul className={styles.listCard}>
									{group.items.map((item) => renderItem(item))}
								</ul>
							) : null}
						</section>
					))}
				</div>
			) : null}

			{!isLoading &&
			view === "aisle" &&
			(activeItems.length > 0 || branches.length > 0) ? (
				<div className={styles.categoryCard}>
					<ShoppingBranchCards branches={branches} context={branchContext} />

					{listedItems.length > 0 ? (
						<DragDropProvider
							sensors={shoppingSortSensors}
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
							<ul className={styles.rowList}>
								{listedItems.map((item, index) => (
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
												isLast: index === listedItems.length - 1,
											})
										}
									</SortableShoppingItem>
								))}
							</ul>
						</DragDropProvider>
					) : null}
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

			{purchase.checkedItemCount > 0 && !isLoading ? (
				<div className={styles.purchaseBar}>
					<Button
						size="lg"
						fullWidth
						status={purchase.isConfirmingPurchase ? "pending" : "idle"}
						pendingLabel="購入確定中"
						aria-label={`購入を確定（${purchase.checkedItemCount}件）`}
						disabled={ownerScope === null}
						onClick={purchase.requestPurchase}
					>
						購入を確定
						<span className={styles.purchaseCount}>
							{purchase.checkedItemCount}
						</span>
					</Button>
				</div>
			) : null}

			{/* 買うものを入れる：いつも画面の隅に出る、丸い「＋」。似た動きの「ほかの入れ方」は、その真上。
			    購入確定のバーがあるときは、まとめて、その上。 */}
			<div
				className={styles.fabGroup}
				data-lifted={purchase.checkedItemCount > 0 && !isLoading}
			>
				<Menu
					label="ほかの入れ方"
					icon="plus-stack"
					placement="above"
					disabled={isLoading}
					items={[
						{
							label: "まとめて追加",
							icon: "rows",
							onSelect: () => setIsBulkAdding(true),
						},
						...(renderRecipePicker
							? [
									{
										label: "レシピから入れる",
										icon: "book" as const,
										onSelect: () => setIsPickingRecipe(true),
									},
								]
							: []),
						{
							label: "条件つきのメモを追加",
							icon: "branch-arrow",
							onSelect: () => setIsCreatingBranch(true),
						},
					]}
					trigger={(props) => (
						<span className={styles.fabSub}>
							<IconButton
								{...props}
								icon="plus-stack"
								label="ほかの入れ方"
								size="std"
								disabled={isLoading}
							/>
						</span>
					)}
				/>

				<button
					type="button"
					className={styles.fab}
					aria-label="買うものを入れる"
					onClick={() => setIsAddingItem(true)}
				>
					<Icon name="plus" size={24} />
				</button>
			</div>

			{conversionEditItem ? (
				<ShoppingItemInventoryConversionForm
					item={conversionEditItem}
					isSaving={isSavingConversionEdit}
					onSave={async (configuration) => {
						const target = conversionEditItem;

						setIsSavingConversionEdit(true);

						try {
							const updated = await shopping.updateItem(target, {
								name: target.name,
								quantity: configuration.quantity,
								unitLabel: configuration.unitLabel,
								inventoryConversion: configuration.inventoryConversion,
							});

							if (updated) {
								// 直したこと自体が意思表示なので、聞かずに、その食材×単位の記憶を更新する。
								await conversionState.remember(updated.name, {
									unitLabel: configuration.unitLabel,
									inventoryConversion: configuration.inventoryConversion,
								});
								setConversionEditItem(null);
							}
						} finally {
							setIsSavingConversionEdit(false);
						}
					}}
					onCancel={() => setConversionEditItem(null)}
				/>
			) : null}

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
