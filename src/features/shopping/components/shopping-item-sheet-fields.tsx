import { useState } from "react";
import { Button } from "#/components/button/button";
import { Chip } from "#/components/chip/chip";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import {
	isShoppingCategoryId,
	type ShoppingCategoryId,
	shoppingCategories,
} from "../domain/shopping-category";
import type { ShoppingItemInventoryConversion } from "../domain/shopping-item";
import {
	getShoppingItemPresets,
	inferShoppingCategory,
	isShoppingItemPresetSelected,
} from "../domain/shopping-item-suggestion";
import type { ShoppingStore } from "../domain/shopping-store";
import * as styles from "./shopping-add-sheet.css";
import {
	ShoppingCategoryField,
	ShoppingNameField,
	ShoppingQuantityUnitFields,
} from "./shopping-item-fields";
import { ShoppingStoreChips } from "./shopping-store-chips";

// 追加・編集のシートで入力中の 1 項目。
export type ShoppingItemDraft = {
	name: string;
	quantity: string;
	unitLabel: string;
	// チップで選んだ換算（名前・単位を変えたら、外す）。
	inventoryConversion: ShoppingItemInventoryConversion | null;
	categoryId: ShoppingCategoryId | "";
	isCategoryManual: boolean;
	storeId: string | null;
};

type ShoppingItemSheetFieldsProps = {
	value: ShoppingItemDraft;
	onChange: (next: ShoppingItemDraft) => void;
	nameLabel: string;
	hideNameLabel?: boolean;
	namePlaceholder?: string;
	stores: readonly ShoppingStore[];
	onCreateStore: (name: string) => Promise<ShoppingStore | null>;
	// 名前を変えたとき・店を選んだときに、ほかの欄も変えたいとき（追加の「いつも買う店」など）。
	onNameChange?: (next: ShoppingItemDraft) => ShoppingItemDraft;
	onStoreChange?: (storeId: string | null) => void;
};

// 数量の単位の候補がないとき（食材のよく使う数量が、ないとき）に並べる、よく使う単位。
const commonUnits = ["個", "本", "パック", "袋", "g"] as const;

// 買い物メモの 1 項目の欄（名前・数量と単位・よく使う数量・店・カテゴリ）。追加と編集のシートで共通。
export function ShoppingItemSheetFields({
	value,
	onChange,
	nameLabel,
	hideNameLabel,
	namePlaceholder,
	stores,
	onCreateStore,
	onNameChange,
	onStoreChange,
}: ShoppingItemSheetFieldsProps) {
	const [isChangingCategory, setIsChangingCategory] = useState(false);
	const presets = getShoppingItemPresets(value.name);
	const categoryLabel = shoppingCategories.find(
		(category) => category.id === value.categoryId,
	)?.label;

	function handleNameChange(name: string) {
		const next: ShoppingItemDraft = {
			...value,
			name,
			inventoryConversion: null,
			categoryId: value.isCategoryManual
				? value.categoryId
				: (inferShoppingCategory(name) ?? ""),
		};

		onChange(onNameChange ? onNameChange(next) : next);
	}

	return (
		<>
			<ShoppingNameField
				label={nameLabel}
				hideLabel={hideNameLabel}
				name="name"
				value={value.name}
				onChange={handleNameChange}
				placeholder={namePlaceholder}
			/>

			<ShoppingQuantityUnitFields
				quantity={value.quantity}
				onQuantityChange={(quantity) => onChange({ ...value, quantity })}
				unitLabel={value.unitLabel}
				onUnitChange={(unitLabel) =>
					onChange({ ...value, unitLabel, inventoryConversion: null })
				}
				quantityName="quantity"
				unitName="unitLabel"
			/>

			<fieldset className={styles.group}>
				<legend className={styles.groupLabel}>
					{presets.length > 0 ? "よく使う数量" : "よく使う単位"}
				</legend>

				<div className={styles.chips}>
					{presets.length > 0
						? presets.map((preset) => (
								<Chip
									pressed={isShoppingItemPresetSelected(preset, value)}
									key={preset.label}
									onClick={() =>
										onChange({
											...value,
											quantity: formatQuantity(preset.quantity, {
												grouping: false,
											}),
											unitLabel: preset.unitLabel,
											inventoryConversion: preset.inventoryConversion,
										})
									}
								>
									{preset.label}
								</Chip>
							))
						: commonUnits.map((unit) => (
								<Chip
									pressed={value.unitLabel === unit}
									key={unit}
									onClick={() =>
										onChange({
											...value,
											unitLabel: unit,
											inventoryConversion: null,
										})
									}
								>
									{unit}
								</Chip>
							))}
				</div>
			</fieldset>

			<ShoppingStoreChips
				stores={stores}
				value={value.storeId}
				onChange={(storeId) => {
					onChange({ ...value, storeId });
					onStoreChange?.(storeId);
				}}
				onCreateStore={onCreateStore}
			/>

			<div className={styles.category}>
				<span className={styles.categoryKey}>カテゴリ</span>
				<span className={styles.categoryValue}>
					{categoryLabel ?? "未設定"}
				</span>
				{value.categoryId && !value.isCategoryManual ? (
					<span className={styles.auto}>自動</span>
				) : null}
				<Button
					variant="ghost"
					size="sm"
					onClick={() => setIsChangingCategory((current) => !current)}
				>
					{isChangingCategory ? "閉じる" : value.categoryId ? "変える" : "選ぶ"}
				</Button>
			</div>

			{isChangingCategory ? (
				<ShoppingCategoryField
					label="カテゴリ"
					name="categoryId"
					value={value.categoryId}
					onChange={(categoryId) =>
						onChange({
							...value,
							categoryId: isShoppingCategoryId(categoryId) ? categoryId : "",
							isCategoryManual: true,
						})
					}
				/>
			) : null}
		</>
	);
}
