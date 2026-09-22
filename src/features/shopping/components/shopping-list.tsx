import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import clsx from "clsx";
import { type ReactNode, type SubmitEvent, useEffect, useState } from "react";
import * as v from "valibot";
import type { SyncInventoryPurchaseOutboxResult } from "#/features/inventory/application/sync-inventory-purchase-outbox";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/infrastructure/inventory-purchase-outbox";
import type { ShoppingRepository } from "../application/shopping-repository";
import {
	isShoppingCategoryId,
	type ShoppingCategoryId,
	shoppingCategories,
} from "../domain/shopping-category";
import {
	createShoppingItem,
	getShoppingItemConvertedQuantityLabel,
	type ShoppingItem,
	type ShoppingItemInventoryConversion,
	toggleShoppingItem,
	updateShoppingItem,
} from "../domain/shopping-item";
import { categorizeUnassignedShoppingItems } from "../domain/shopping-item-categorization";
import {
	type ShoppingAisleDirection,
	sortShoppingItemsByCategory,
} from "../domain/shopping-item-category-order";
import {
	moveShoppingItem,
	moveShoppingItemToIndex,
	type ShoppingItemMoveDirection,
} from "../domain/shopping-item-order";
import {
	getShoppingItemPresets,
	inferShoppingCategory,
	isShoppingItemPresetSelected,
} from "../domain/shopping-item-suggestion";
import {
	type ConfirmCheckedShoppingItemsPurchaseResult,
	confirmCheckedShoppingItemsPurchase,
} from "../infrastructure/dexie-shopping-purchase";
import { dexieShoppingRepository } from "../infrastructure/dexie-shopping-repository";
import * as styles from "./shopping-list.css";

function getErrorMessage(error: unknown): string {
	if (v.isValiError(error)) {
		return error.issues[0]?.message ?? "入力内容を確認してください";
	}

	return "処理に失敗しました。もう一度お試しください";
}

type SortableShoppingItemProps = {
	id: string;
	index: number;
	className: string;
	disabled: boolean;
	children: (
		handleRef: ReturnType<typeof useSortable>["handleRef"],
	) => ReactNode;
};

function SortableShoppingItem({
	id,
	index,
	className,
	disabled,
	children,
}: SortableShoppingItemProps) {
	const { ref, handleRef, isDragging } = useSortable({
		id,
		index,
		disabled,
	});

	return (
		<li
			className={clsx(className, isDragging && styles.draggingItem)}
			ref={ref}
		>
			{children(handleRef)}
		</li>
	);
}

type SyncPurchases = (
	ownerScope: InventoryPurchaseOwnerScope,
) => Promise<SyncInventoryPurchaseOutboxResult>;

type ConfirmPurchases = (
	ownerScope: InventoryPurchaseOwnerScope,
) => Promise<ConfirmCheckedShoppingItemsPurchaseResult>;

type ShoppingListProps = {
	repository?: ShoppingRepository;
	confirmPurchases?: ConfirmPurchases;
	syncPurchases?: SyncPurchases;
	ownerScope?: InventoryPurchaseOwnerScope | null;
};

export function ShoppingList({
	repository = dexieShoppingRepository,
	confirmPurchases = confirmCheckedShoppingItemsPurchase,
	syncPurchases,
	ownerScope = "guest",
}: ShoppingListProps) {
	const [items, setItems] = useState<ShoppingItem[]>([]);
	const [name, setName] = useState("");
	const [quantity, setQuantity] = useState("1");
	const [unitLabel, setUnitLabel] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [editingItemId, setEditingItemId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editQuantity, setEditQuantity] = useState("1");
	const [editUnitLabel, setEditUnitLabel] = useState("");
	const [inventoryConversion, setInventoryConversion] =
		useState<ShoppingItemInventoryConversion | null>(null);
	const [isSavingEdit, setIsSavingEdit] = useState(false);
	const [isReordering, setIsReordering] = useState(false);
	const [categoryId, setCategoryId] = useState<ShoppingCategoryId | "">("");
	const [isCategoryManuallySelected, setIsCategoryManuallySelected] =
		useState(false);
	const [editCategoryId, setEditCategoryId] = useState<ShoppingCategoryId | "">(
		"",
	);
	const [isEditCategoryManuallySelected, setIsEditCategoryManuallySelected] =
		useState(false);
	const [isConfirmingPurchase, setIsConfirmingPurchase] = useState(false);

	const presets = getShoppingItemPresets(name);
	const checkedItemCount = items.filter(
		(item) => item.status === "checked",
	).length;

	useEffect(() => {
		let isActive = true;

		async function loadItems() {
			try {
				const storedItems = await repository.list();
				const categorizedItems = categorizeUnassignedShoppingItems(storedItems);
				const categoryChanged = categorizedItems.some(
					(item, index) => item !== storedItems[index],
				);

				if (isActive) {
					setItems(categorizedItems);
				}

				if (categoryChanged) {
					try {
						await repository.saveAll(categorizedItems);
					} catch {
						if (isActive) {
							setErrorMessage("買い物メモの商品カテゴリを保存できませんでした");
						}
					}
				}
			} catch {
				if (isActive) {
					setErrorMessage("買い物メモを読み込めませんでした");
				}
			} finally {
				if (isActive) {
					setIsLoading(false);
				}
			}
		}

		void loadItems();

		return () => {
			isActive = false;
		};
	}, [repository]);

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage(null);
		setIsSubmitting(true);

		try {
			const nextSortOrder =
				items.reduce(
					(highestSortOrder, item) =>
						Math.max(highestSortOrder, item.sortOrder),
					-1,
				) + 1;

			const item = createShoppingItem(
				{
					name,
					quantity: Number(quantity),
					unitLabel,
					inventoryConversion,
					categoryId: categoryId || null,
					categoryAssignment: categoryId
						? isCategoryManuallySelected
							? "manual"
							: "automatic"
						: null,
				},
				new Date(),
				nextSortOrder,
			);

			await repository.save(item);

			setItems((currentItems) => [...currentItems, item]);
			setName("");
			setQuantity("1");
			setUnitLabel("");
			setCategoryId("");
			setIsCategoryManuallySelected(false);
			setInventoryConversion(null);
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleToggle(item: ShoppingItem) {
		setErrorMessage(null);

		try {
			const updatedItem = toggleShoppingItem(item);

			await repository.save(updatedItem);

			setItems((currentItems) =>
				currentItems.map((currentItem) =>
					currentItem.id === updatedItem.id ? updatedItem : currentItem,
				),
			);
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		}
	}

	async function handleConfirmPurchases() {
		if (!ownerScope) {
			return;
		}

		setErrorMessage(null);
		setIsConfirmingPurchase(true);

		try {
			const result = await confirmPurchases(ownerScope);

			if (result.status === "nothing-to-confirm") {
				return;
			}

			if (result.status === "missing-conversion") {
				const itemNames = result.items.map((item) => item.name).join("、");

				setErrorMessage(`在庫換算を設定してください: ${itemNames}`);
				return;
			}

			const purchasedItemsById = new Map(
				result.items.map((item) => [item.id, item]),
			);

			setItems((currentItems) =>
				currentItems.map((item) => purchasedItemsById.get(item.id) ?? item),
			);

			if (ownerScope === "guest" || !syncPurchases) {
				return;
			}

			try {
				const syncResult = await syncPurchases(ownerScope);

				if (syncResult.failedEntryId) {
					setErrorMessage(
						"購入は保存しました。在庫への反映は通信復旧後に再試行します",
					);
				}
			} catch {
				setErrorMessage(
					"購入は保存しました。在庫への反映は通信復旧後に再試行します",
				);
			}
		} catch {
			setErrorMessage("購入確定を保存できませんでした。もう一度お試しください");
		} finally {
			setIsConfirmingPurchase(false);
		}
	}

	function handleStartEditing(item: ShoppingItem) {
		setErrorMessage(null);
		setEditingItemId(item.id);
		setEditName(item.name);
		setEditQuantity(String(item.quantity));
		setEditUnitLabel(item.unitLabel ?? "");
		setEditCategoryId(item.categoryId ?? "");
		setIsEditCategoryManuallySelected(item.categoryAssignment === "manual");
	}

	function handleCancelEditing() {
		setEditingItemId(null);
		setEditName("");
		setEditQuantity("1");
		setEditUnitLabel("");
		setEditCategoryId("");
		setIsEditCategoryManuallySelected(false);
	}

	async function handleEditSubmit(
		event: SubmitEvent<HTMLFormElement>,
		item: ShoppingItem,
	) {
		event.preventDefault();
		setErrorMessage(null);
		setIsSavingEdit(true);

		try {
			const updatedItem = updateShoppingItem(item, {
				name: editName,
				quantity: Number(editQuantity),
				unitLabel: editUnitLabel,
				categoryId: editCategoryId || null,
				categoryAssignment: editCategoryId
					? isEditCategoryManuallySelected
						? "manual"
						: "automatic"
					: null,
			});

			await repository.save(updatedItem);

			setItems((currentItems) =>
				currentItems.map((currentItem) =>
					currentItem.id === updatedItem.id ? updatedItem : currentItem,
				),
			);

			handleCancelEditing();
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		} finally {
			setIsSavingEdit(false);
		}
	}

	async function handleMove(
		itemId: string,
		direction: ShoppingItemMoveDirection,
	) {
		setErrorMessage(null);
		setIsReordering(true);

		try {
			const reorderedItems = moveShoppingItem(items, itemId, direction);

			await repository.saveAll(reorderedItems);
			setItems(reorderedItems);
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		} finally {
			setIsReordering(false);
		}
	}

	async function handleRemove(id: string) {
		setErrorMessage(null);

		try {
			await repository.remove(id);

			setItems((currentItems) => currentItems.filter((item) => item.id !== id));
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		}
	}

	function handleNameChange(value: string) {
		setName(value);
		setInventoryConversion(null);

		if (!isCategoryManuallySelected) {
			setCategoryId(inferShoppingCategory(value) ?? "");
		}
	}

	function handleCategoryChange(value: string) {
		setCategoryId(isShoppingCategoryId(value) ? value : "");
		setIsCategoryManuallySelected(true);
	}

	function handleEditNameChange(value: string) {
		setEditName(value);

		if (!isEditCategoryManuallySelected) {
			setEditCategoryId(inferShoppingCategory(value) ?? "");
		}
	}

	function handleEditCategoryChange(value: string) {
		setEditCategoryId(isShoppingCategoryId(value) ? value : "");
		setIsEditCategoryManuallySelected(true);
	}

	async function handleSortByCategory(direction: ShoppingAisleDirection) {
		setErrorMessage(null);
		setIsReordering(true);

		try {
			const reorderedItems = sortShoppingItemsByCategory(items, { direction });

			await repository.saveAll(reorderedItems);
			setItems(reorderedItems);
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		} finally {
			setIsReordering(false);
		}
	}

	async function handleDragMove(fromIndex: number, toIndex: number) {
		if (fromIndex === toIndex) {
			return;
		}

		setErrorMessage(null);
		setIsReordering(true);

		try {
			const reorderedItems = moveShoppingItemToIndex(items, fromIndex, toIndex);

			await repository.saveAll(reorderedItems);
			setItems(reorderedItems);
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		} finally {
			setIsReordering(false);
		}
	}

	return (
		<main className={styles.container}>
			<h1 className={styles.title}>買い物メモ</h1>

			<div className={styles.toolbar}>
				<button
					className={styles.sortButton}
					type="button"
					disabled={items.length < 2 || isReordering}
					onClick={() => void handleSortByCategory("forward")}
				>
					売り場順
				</button>

				<button
					className={styles.sortButton}
					type="button"
					disabled={items.length < 2 || isReordering}
					onClick={() => void handleSortByCategory("reverse")}
				>
					逆回り
				</button>
			</div>
			<form className={styles.form} onSubmit={handleSubmit}>
				<div className={styles.field}>
					<label className={styles.label} htmlFor="shopping-item-name">
						買うもの
					</label>

					<input
						className={styles.input}
						id="shopping-item-name"
						name="name"
						value={name}
						onChange={(event) => handleNameChange(event.target.value)}
						placeholder="卵、牛乳など"
						autoComplete="off"
					/>
				</div>

				<div className={styles.details}>
					<div className={styles.field}>
						<label
							className={styles.fieldLabel}
							htmlFor="shopping-item-quantity"
						>
							数量
						</label>

						<input
							className={styles.input}
							id="shopping-item-quantity"
							name="quantity"
							type="number"
							inputMode="decimal"
							min="0"
							step="any"
							value={quantity}
							onChange={(event) => setQuantity(event.target.value)}
						/>
					</div>

					<div className={styles.field}>
						<label className={styles.fieldLabel} htmlFor="shopping-item-unit">
							単位
						</label>

						<input
							className={styles.input}
							id="shopping-item-unit"
							name="unitLabel"
							value={unitLabel}
							onChange={(event) => {
								setUnitLabel(event.target.value);
								setInventoryConversion(null);
							}}
							placeholder="個、袋、gなど"
							autoComplete="off"
						/>
					</div>

					<div className={styles.field}>
						<label
							className={styles.fieldLabel}
							htmlFor="shopping-item-category"
						>
							カテゴリ
						</label>

						<select
							className={styles.input}
							id="shopping-item-category"
							name="categoryId"
							value={categoryId}
							onChange={(event) => handleCategoryChange(event.target.value)}
						>
							<option value="">未設定</option>

							{shoppingCategories.map((category) => (
								<option value={category.id} key={category.id}>
									{category.label}
								</option>
							))}
						</select>
					</div>
				</div>

				{presets.length > 0 ? (
					<fieldset className={styles.presets}>
						<legend className={styles.presetLegend}>よく使う数量</legend>

						<div className={styles.presetList}>
							{presets.map((preset) => {
								const isSelected = isShoppingItemPresetSelected(preset, {
									quantity,
									unitLabel,
									inventoryConversion,
								});

								return (
									<button
										className={styles.presetButton}
										type="button"
										aria-pressed={isSelected}
										key={preset.label}
										onClick={() => {
											setQuantity(String(preset.quantity));
											setUnitLabel(preset.unitLabel);
											setInventoryConversion(preset.inventoryConversion);
										}}
									>
										{preset.label}
									</button>
								);
							})}
						</div>
					</fieldset>
				) : null}

				<button
					className={styles.addButton}
					type="submit"
					disabled={isSubmitting}
				>
					追加
				</button>

				{errorMessage ? (
					<p className={styles.error} role="alert">
						{errorMessage}
					</p>
				) : null}
			</form>

			<div className={styles.purchaseActions}>
				<button
					className={styles.purchaseButton}
					type="button"
					disabled={
						checkedItemCount === 0 ||
						isConfirmingPurchase ||
						isLoading ||
						ownerScope === null
					}
					onClick={() => void handleConfirmPurchases()}
				>
					{isConfirmingPurchase
						? "購入確定中…"
						: `チェック済みを購入確定（${checkedItemCount}件）`}
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

						void handleDragMove(source.initialIndex, source.index);
					}}
				>
					<ul className={styles.list}>
						{items.map((item, index) => {
							const isPurchased = item.status === "purchased";
							const isChecked = item.status === "checked" || isPurchased;
							const isFirst = index === 0;
							const isLast = index === items.length - 1;
							const convertedQuantityLabel =
								getShoppingItemConvertedQuantityLabel(item);

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
											<form
												className={styles.editForm}
												onSubmit={(event) => void handleEditSubmit(event, item)}
											>
												<div className={styles.field}>
													<label
														className={styles.fieldLabel}
														htmlFor={`edit-name-${item.id}`}
													>
														商品名
													</label>

													<input
														className={styles.input}
														id={`edit-name-${item.id}`}
														value={editName}
														onChange={(event) =>
															handleEditNameChange(event.target.value)
														}
														autoComplete="off"
													/>
												</div>

												<div className={styles.details}>
													<div className={styles.field}>
														<label
															className={styles.fieldLabel}
															htmlFor={`edit-quantity-${item.id}`}
														>
															数量
														</label>

														<input
															className={styles.input}
															id={`edit-quantity-${item.id}`}
															type="number"
															inputMode="decimal"
															min="0"
															step="any"
															value={editQuantity}
															onChange={(event) =>
																setEditQuantity(event.target.value)
															}
														/>
													</div>

													<div className={styles.field}>
														<label
															className={styles.fieldLabel}
															htmlFor={`edit-unit-${item.id}`}
														>
															単位
														</label>

														<input
															className={styles.input}
															id={`edit-unit-${item.id}`}
															value={editUnitLabel}
															onChange={(event) =>
																setEditUnitLabel(event.target.value)
															}
															autoComplete="off"
														/>
													</div>

													<div className={styles.field}>
														<label
															className={styles.fieldLabel}
															htmlFor={`edit-category-${item.id}`}
														>
															編集するカテゴリ
														</label>

														<select
															className={styles.input}
															id={`edit-category-${item.id}`}
															value={editCategoryId}
															onChange={(event) =>
																handleEditCategoryChange(event.target.value)
															}
														>
															<option value="">未設定</option>

															{shoppingCategories.map((category) => (
																<option value={category.id} key={category.id}>
																	{category.label}
																</option>
															))}
														</select>
													</div>
												</div>

												<div className={styles.editActions}>
													<button
														className={styles.cancelButton}
														type="button"
														onClick={handleCancelEditing}
														disabled={isSavingEdit}
													>
														キャンセル
													</button>

													<button
														className={styles.saveButton}
														type="submit"
														disabled={isSavingEdit}
													>
														保存
													</button>
												</div>
											</form>
										) : (
											<>
												<button
													className={styles.dragHandle}
													type="button"
													ref={dragHandleRef}
													aria-label={`${item.name}をドラッグして並び替え`}
													disabled={isReordering}
												>
													⠿
												</button>
												<input
													className={styles.checkbox}
													type="checkbox"
													checked={isChecked}
													disabled={isPurchased}
													aria-label={`${item.name}をチェック`}
													onChange={() => void handleToggle(item)}
												/>

												<span
													className={clsx(
														styles.itemName,
														isChecked && styles.checkedItemName,
													)}
												>
													{item.name}
													<span className={styles.quantity}>
														{item.quantity}
														{item.unitLabel}

														{convertedQuantityLabel ? (
															<span className={styles.convertedQuantity}>
																（{convertedQuantityLabel}）
															</span>
														) : null}
													</span>

													{isPurchased ? (
														<span className={styles.purchasedLabel}>
															購入済み
														</span>
													) : null}
												</span>

												<div className={styles.itemActions}>
													<button
														className={styles.moveButton}
														type="button"
														aria-label={`${item.name}を上へ`}
														disabled={isFirst || isReordering}
														onClick={() => void handleMove(item.id, "up")}
													>
														↑
													</button>

													<button
														className={styles.moveButton}
														type="button"
														aria-label={`${item.name}を下へ`}
														disabled={isLast || isReordering}
														onClick={() => void handleMove(item.id, "down")}
													>
														↓
													</button>

													<button
														className={styles.editButton}
														type="button"
														onClick={() => handleStartEditing(item)}
													>
														編集
													</button>

													<button
														className={styles.deleteButton}
														type="button"
														aria-label={`${item.name}を削除`}
														onClick={() => void handleRemove(item.id)}
													>
														削除
													</button>
												</div>
											</>
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
