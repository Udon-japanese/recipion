import clsx from "clsx";
import { type FormEvent, type SubmitEvent, useEffect, useState } from "react";
import * as v from "valibot";
import type { ShoppingRepository } from "../application/shopping-repository";
import {
	createShoppingItem,
	type ShoppingItem,
	toggleShoppingItem,
} from "../domain/shopping-item";
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
			const item = createShoppingItem({
				name,
				quantity: Number(quantity),
				unitLabel,
			});

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
					{items.map((item) => {
						const isChecked = item.status === "checked";

						return (
							<li
								className={clsx(styles.item, isChecked && styles.checkedItem)}
								key={item.id}
							>
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

								<button
									className={styles.deleteButton}
									type="button"
									aria-label={`${item.name}を削除`}
									onClick={() => void handleRemove(item.id)}
								>
									削除
								</button>
							</li>
						);
					})}
				</ul>
			) : null}
		</main>
	);
}
