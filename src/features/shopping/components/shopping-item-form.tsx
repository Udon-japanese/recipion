import { type SubmitEvent, useState } from "react";
import { IngredientNameInput } from "#/features/ingredients/components/ingredient-name-input";
import { QuantityInput } from "#/features/quantity/components/quantity-input";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import {
	isShoppingCategoryId,
	type ShoppingCategoryId,
	shoppingCategories,
} from "../domain/shopping-category";
import type {
	CreateShoppingItemInput,
	ShoppingItemInventoryConversion,
} from "../domain/shopping-item";
import {
	getShoppingItemPresets,
	inferShoppingCategory,
	isShoppingItemPresetSelected,
} from "../domain/shopping-item-suggestion";
import * as styles from "./shopping-list.css";

type ShoppingItemFormProps = {
	// 追加する。成功したら true（入力欄を空に戻す）。失敗したときのエラーは、呼び出し側が表示する。
	onAdd: (input: CreateShoppingItemInput) => Promise<boolean>;
	errorMessage: string | null;
};

// 買い物メモへ、商品を追加するフォーム。
export function ShoppingItemForm({
	onAdd,
	errorMessage,
}: ShoppingItemFormProps) {
	const [name, setName] = useState("");
	const [quantity, setQuantity] = useState("1");
	const [unitLabel, setUnitLabel] = useState("");
	const [inventoryConversion, setInventoryConversion] =
		useState<ShoppingItemInventoryConversion | null>(null);
	const [categoryId, setCategoryId] = useState<ShoppingCategoryId | "">("");
	const [isCategoryManuallySelected, setIsCategoryManuallySelected] =
		useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const presets = getShoppingItemPresets(name);

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

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setIsSubmitting(true);

		try {
			const added = await onAdd({
				name,
				quantity: parseQuantityInput(quantity) ?? Number.NaN,
				unitLabel,
				inventoryConversion,
				categoryId: categoryId || null,
				categoryAssignment: categoryId
					? isCategoryManuallySelected
						? "manual"
						: "automatic"
					: null,
			});

			if (added) {
				setName("");
				setQuantity("1");
				setUnitLabel("");
				setCategoryId("");
				setIsCategoryManuallySelected(false);
				setInventoryConversion(null);
			}
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<form
			className={styles.form}
			onSubmit={(event) => void handleSubmit(event)}
		>
			<div className={styles.field}>
				<label className={styles.label} htmlFor="shopping-item-name">
					買うもの
				</label>

				<IngredientNameInput
					className={styles.input}
					id="shopping-item-name"
					name="name"
					value={name}
					onChange={handleNameChange}
					placeholder="卵、牛乳など"
				/>
			</div>

			<div className={styles.details}>
				<div className={styles.field}>
					<label className={styles.fieldLabel} htmlFor="shopping-item-quantity">
						数量
					</label>

					<QuantityInput
						className={styles.input}
						id="shopping-item-quantity"
						name="quantity"
						value={quantity}
						onChange={setQuantity}
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
					<label className={styles.fieldLabel} htmlFor="shopping-item-category">
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
										setQuantity(
											formatQuantity(preset.quantity, { grouping: false }),
										);
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
	);
}
