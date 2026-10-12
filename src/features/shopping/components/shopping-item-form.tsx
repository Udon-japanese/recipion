import { type ReactNode, type SubmitEvent, useState } from "react";
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
import type { ShoppingStore } from "../domain/shopping-store";
import * as styles from "./shopping-list.css";
import { ShoppingStoreSelect } from "./shopping-store-select";

type ShoppingItemFormProps = {
	// 追加する。成功したら true（入力欄を空に戻す）。失敗したときのエラーは、呼び出し側が表示する。
	onAdd: (input: CreateShoppingItemInput) => Promise<boolean>;
	errorMessage: string | null;
	stores: readonly ShoppingStore[];
	// 食材名に対して、いつも買う店（なければ null）。
	defaultStoreIdFor: (itemName: string) => string | null;
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
	// 同じ画面に複数置くとき、欄の id が重ならないようにする。
	idPrefix?: string;
	submitLabel?: string;
	// 追加ボタンの上に足す欄（条件つきのメモの「どんな時に」など）。
	children?: ReactNode;
};

// 買い物メモへ、商品を追加するフォーム。
export function ShoppingItemForm({
	onAdd,
	errorMessage,
	stores,
	defaultStoreIdFor,
	onCreateStore,
	idPrefix = "shopping-item",
	submitLabel = "追加",
	children,
}: ShoppingItemFormProps) {
	const [name, setName] = useState("");
	const [quantity, setQuantity] = useState("1");
	const [unitLabel, setUnitLabel] = useState("");
	const [inventoryConversion, setInventoryConversion] =
		useState<ShoppingItemInventoryConversion | null>(null);
	const [categoryId, setCategoryId] = useState<ShoppingCategoryId | "">("");
	const [isCategoryManuallySelected, setIsCategoryManuallySelected] =
		useState(false);
	const [storeId, setStoreId] = useState<string | null>(null);
	// 店を自分で選んだら、名前の入力で「いつも買う店」を入れ直さない。
	const [isStoreChosen, setIsStoreChosen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const presets = getShoppingItemPresets(name);

	function handleNameChange(value: string) {
		setName(value);
		setInventoryConversion(null);

		if (!isCategoryManuallySelected) {
			setCategoryId(inferShoppingCategory(value) ?? "");
		}

		if (!isStoreChosen) {
			setStoreId(defaultStoreIdFor(value));
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
				storeId,
			});

			if (added) {
				setStoreId(null);
				setIsStoreChosen(false);
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
				<label className={styles.label} htmlFor={`${idPrefix}-name`}>
					買うもの
				</label>

				<IngredientNameInput
					className={styles.input}
					id={`${idPrefix}-name`}
					name="name"
					value={name}
					onChange={handleNameChange}
					placeholder="卵、牛乳など"
				/>
			</div>

			<div className={styles.details}>
				<div className={styles.field}>
					<label className={styles.fieldLabel} htmlFor={`${idPrefix}-quantity`}>
						数量
					</label>

					<QuantityInput
						className={styles.input}
						id={`${idPrefix}-quantity`}
						name="quantity"
						value={quantity}
						onChange={setQuantity}
					/>
				</div>

				<div className={styles.field}>
					<label className={styles.fieldLabel} htmlFor={`${idPrefix}-unit`}>
						単位
					</label>

					<input
						className={styles.input}
						id={`${idPrefix}-unit`}
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
					<label className={styles.fieldLabel} htmlFor={`${idPrefix}-category`}>
						カテゴリ
					</label>

					<select
						className={styles.input}
						id={`${idPrefix}-category`}
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

			<div className={styles.field}>
				<label className={styles.fieldLabel} htmlFor={`${idPrefix}-store`}>
					買う店
				</label>

				<ShoppingStoreSelect
					id={`${idPrefix}-store`}
					stores={stores}
					value={storeId}
					onChange={(next) => {
						setStoreId(next);
						setIsStoreChosen(true);
					}}
					onCreateStore={onCreateStore}
				/>
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

			{children}

			<button
				className={styles.addButton}
				type="submit"
				disabled={isSubmitting}
			>
				{submitLabel}
			</button>

			{errorMessage ? (
				<p className={styles.error} role="alert">
					{errorMessage}
				</p>
			) : null}
		</form>
	);
}
