import clsx from "clsx";
import { type SubmitEvent, useEffect, useState } from "react";
import * as v from "valibot";
import type { ShoppingRepository } from "../application/shopping-repository";
import {
	createShoppingItem,
	type ShoppingItem,
	toggleShoppingItem,
	updateShoppingItem,
} from "../domain/shopping-item";
import {
	moveShoppingItem,
	type ShoppingItemMoveDirection,
} from "../domain/shopping-item-order";
import { getShoppingItemPresets } from "../domain/shopping-item-preset";
import { dexieShoppingRepository } from "../infrastructure/dexie-shopping-repository";
import * as styles from "./shopping-list.css";

function getErrorMessage(error: unknown): string {
	if (v.isValiError(error)) {
		return error.issues[0]?.message ?? "入力内容を確認してください";
	}

	return "処理に失敗しました。もう一度お試しください";
}

type ShoppingListProps = {
	repository?: ShoppingRepository;
};

export function ShoppingList({
	repository = dexieShoppingRepository,
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
	const [isSavingEdit, setIsSavingEdit] = useState(false);
	const [isReordering, setIsReordering] = useState(false);

	const presets = getShoppingItemPresets(name);

	useEffect(() => {
		let isActive = true;

		async function loadItems() {
			try {
				const storedItems = await repository.list();

				if (isActive) {
					setItems(storedItems);
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
				},
				new Date(),
				nextSortOrder,
			);

			await repository.save(item);

			setItems((currentItems) => [...currentItems, item]);
			setName("");
			setQuantity("1");
			setUnitLabel("");
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

	function handleStartEditing(item: ShoppingItem) {
		setErrorMessage(null);
		setEditingItemId(item.id);
		setEditName(item.name);
		setEditQuantity(String(item.quantity));
		setEditUnitLabel(item.unitLabel ?? "");
	}

	function handleCancelEditing() {
		setEditingItemId(null);
		setEditName("");
		setEditQuantity("1");
		setEditUnitLabel("");
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

	return (
		<main className={styles.container}>
			<h1 className={styles.title}>買い物メモ</h1>

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
						onChange={(event) => setName(event.target.value)}
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
							onChange={(event) => setUnitLabel(event.target.value)}
							placeholder="個、袋、gなど"
							autoComplete="off"
						/>
					</div>
				</div>

				{presets.length > 0 ? (
					<fieldset className={styles.presets}>
						<legend className={styles.presetLegend}>よく使う数量</legend>

						<div className={styles.presetList}>
							{presets.map((preset) => {
								const isSelected =
									quantity === String(preset.quantity) &&
									unitLabel === preset.unitLabel;

								return (
									<button
										className={styles.presetButton}
										type="button"
										aria-pressed={isSelected}
										key={`${preset.quantity}-${preset.unitLabel}`}
										onClick={() => {
											setQuantity(String(preset.quantity));
											setUnitLabel(preset.unitLabel);
										}}
									>
										{preset.quantity}
										{preset.unitLabel}
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

			{isLoading ? <p className={styles.message}>読み込んでいます…</p> : null}

			{!isLoading && items.length === 0 ? (
				<p className={styles.message}>買うものはまだありません。</p>
			) : null}

			{!isLoading && items.length > 0 ? (
				<ul className={styles.list}>
					{items.map((item, index) => {
						const isChecked = item.status === "checked";
						const isFirst = index === 0;
						const isLast = index === items.length - 1;

						return (
							<li
								className={clsx(styles.item, isChecked && styles.checkedItem)}
								key={item.id}
							>
								{editingItemId === item.id ? (
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
												onChange={(event) => setEditName(event.target.value)}
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
										<input
											className={styles.checkbox}
											type="checkbox"
											checked={isChecked}
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
											</span>
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
								)}
							</li>
						);
					})}
				</ul>
			) : null}
		</main>
	);
}
