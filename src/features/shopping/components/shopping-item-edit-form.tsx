import { type SubmitEvent, useState } from "react";
import { Button } from "#/components/button/button";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import {
	isShoppingCategoryId,
	type ShoppingCategoryId,
} from "../domain/shopping-category";
import type {
	ShoppingItem,
	UpdateShoppingItemInput,
} from "../domain/shopping-item";
import { inferShoppingCategory } from "../domain/shopping-item-suggestion";
import type { ShoppingStore } from "../domain/shopping-store";
import {
	ShoppingCategoryField,
	ShoppingNameField,
	ShoppingQuantityUnitFields,
	ShoppingStoreField,
} from "./shopping-item-fields";
import * as styles from "./shopping-page.css";

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
			className={styles.editCard}
			aria-label={`${item.name}の編集`}
			onSubmit={(event) => void handleSubmit(event)}
		>
			<ShoppingNameField
				label="商品名"
				value={name}
				onChange={handleNameChange}
			/>

			<ShoppingQuantityUnitFields
				quantity={quantity}
				onQuantityChange={setQuantity}
				unitLabel={unitLabel}
				onUnitChange={setUnitLabel}
			/>

			<ShoppingCategoryField
				label="編集するカテゴリ"
				value={categoryId}
				onChange={handleCategoryChange}
			/>

			<ShoppingStoreField
				stores={stores}
				value={storeId}
				onChange={setStoreId}
				onCreateStore={onCreateStore}
			/>

			<div className={styles.editButtons}>
				<Button
					variant="secondary"
					fullWidth
					onClick={onCancel}
					disabled={isSaving}
				>
					キャンセル
				</Button>

				<Button fullWidth type="submit" disabled={isSaving}>
					保存
				</Button>
			</div>
		</form>
	);
}
