import { type SubmitEvent, useState } from "react";
import { IngredientNameInput } from "#/features/ingredients/components/ingredient-name-input";
import { QuantityInput } from "#/features/quantity/components/quantity-input";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import { PickerSelect } from "../../../components/select/picker-select";
import {
	isShoppingCategoryId,
	type ShoppingCategoryId,
	shoppingCategories,
} from "../domain/shopping-category";
import type {
	ShoppingItem,
	UpdateShoppingItemInput,
} from "../domain/shopping-item";
import { inferShoppingCategory } from "../domain/shopping-item-suggestion";
import type { ShoppingStore } from "../domain/shopping-store";
import * as styles from "./shopping-list.css";
import { ShoppingStoreSelect } from "./shopping-store-select";

type ShoppingItemEditFormProps = {
	item: ShoppingItem;
	// 保存する。成功したら true（呼び出し側が、編集を終える）。失敗したら、エラーの表示は、呼び出し側が行う。
	onSave: (
		item: ShoppingItem,
		input: UpdateShoppingItemInput,
	) => Promise<boolean>;
	onCancel: () => void;
	stores: readonly ShoppingStore[];
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
};

// 一覧の中で、1 項目を編集する欄（商品名・数量・単位・カテゴリ）。
export function ShoppingItemEditForm({
	item,
	onSave,
	onCancel,
	stores,
	onCreateStore,
}: ShoppingItemEditFormProps) {
	const [name, setName] = useState(item.name);
	const [quantity, setQuantity] = useState(
		formatQuantity(item.quantity, { grouping: false }),
	);
	const [unitLabel, setUnitLabel] = useState(item.unitLabel ?? "");
	const [categoryId, setCategoryId] = useState<ShoppingCategoryId | "">(
		item.categoryId ?? "",
	);
	const [isCategoryManuallySelected, setIsCategoryManuallySelected] = useState(
		item.categoryAssignment === "manual",
	);
	const [storeId, setStoreId] = useState<string | null>(item.storeId);
	const [isSaving, setIsSaving] = useState(false);

	function handleNameChange(value: string) {
		setName(value);

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
		setIsSaving(true);

		try {
			await onSave(item, {
				name,
				quantity: parseQuantityInput(quantity) ?? Number.NaN,
				unitLabel,
				categoryId: categoryId || null,
				categoryAssignment: categoryId
					? isCategoryManuallySelected
						? "manual"
						: "automatic"
					: null,
				storeId,
			});
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<form
			className={styles.editForm}
			onSubmit={(event) => void handleSubmit(event)}
		>
			<div className={styles.field}>
				<label className={styles.fieldLabel} htmlFor={`edit-name-${item.id}`}>
					商品名
				</label>

				<IngredientNameInput
					className={styles.input}
					id={`edit-name-${item.id}`}
					value={name}
					onChange={handleNameChange}
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

					<QuantityInput
						className={styles.input}
						id={`edit-quantity-${item.id}`}
						value={quantity}
						onChange={setQuantity}
						unitLabel={unitLabel}
					/>
				</div>

				<div className={styles.field}>
					<label className={styles.fieldLabel} htmlFor={`edit-unit-${item.id}`}>
						単位
					</label>

					<input
						className={styles.input}
						id={`edit-unit-${item.id}`}
						value={unitLabel}
						onChange={(event) => setUnitLabel(event.target.value)}
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

					<PickerSelect
						className={styles.input}
						id={`edit-category-${item.id}`}
						value={categoryId}
						onChange={(event) => handleCategoryChange(event.target.value)}
					>
						<option value="">未設定</option>

						{shoppingCategories.map((category) => (
							<option value={category.id} key={category.id}>
								{category.label}
							</option>
						))}
					</PickerSelect>
				</div>
			</div>

			<div className={styles.field}>
				<label className={styles.fieldLabel} htmlFor={`edit-store-${item.id}`}>
					買う店
				</label>

				<ShoppingStoreSelect
					id={`edit-store-${item.id}`}
					stores={stores}
					value={storeId}
					onChange={setStoreId}
					onCreateStore={onCreateStore}
				/>
			</div>

			<div className={styles.editActions}>
				<button
					className={styles.cancelButton}
					type="button"
					onClick={onCancel}
					disabled={isSaving}
				>
					キャンセル
				</button>

				<button className={styles.saveButton} type="submit" disabled={isSaving}>
					保存
				</button>
			</div>
		</form>
	);
}
