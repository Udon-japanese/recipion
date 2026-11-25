import { inferItemCategory } from "#/features/item-category/domain/infer-item-category";
import type { ItemCategoryId } from "#/features/item-category/domain/item-category";
import type { ShoppingItemInventoryConversion } from "../domain/shopping-item";
import type { ShoppingMemories } from "../domain/shopping-item-memory";
import type { ShoppingStore } from "../domain/shopping-store";
import { ShoppingAmountChoices } from "./shopping-amount-choices";
import { ShoppingCategoryPicker } from "./shopping-category-picker";
import {
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
	categoryId: ItemCategoryId | "";
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
	// 数量・単位・換算を、自分で決めたとき（入力・チップ）。
	onAmountChange?: () => void;
	// カテゴリを、自分で選んだとき。
	onCategoryChange?: () => void;
	// いつもの買い方・換算の記憶（単位のチップを、食材ごとに並べる）。
	memories: ShoppingMemories;
};

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
	onAmountChange,
	onCategoryChange,
	memories,
}: ShoppingItemSheetFieldsProps) {
	function handleNameChange(name: string) {
		const next: ShoppingItemDraft = {
			...value,
			name,
			inventoryConversion: null,
			categoryId: value.isCategoryManual
				? value.categoryId
				: (inferItemCategory(name) ?? ""),
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
				onQuantityChange={(quantity) => {
					onChange({ ...value, quantity });
					onAmountChange?.();
				}}
				unitLabel={value.unitLabel}
				onUnitChange={(unitLabel) => {
					onChange({ ...value, unitLabel, inventoryConversion: null });
					onAmountChange?.();
				}}
				quantityName="quantity"
				unitName="unitLabel"
			/>

			<ShoppingAmountChoices
				itemName={value.name}
				value={{
					quantity: value.quantity,
					unitLabel: value.unitLabel,
					inventoryConversion: value.inventoryConversion,
				}}
				onChange={(amount) => {
					onChange({ ...value, ...amount });
					onAmountChange?.();
				}}
				memories={memories}
			/>

			<ShoppingStoreChips
				stores={stores}
				value={value.storeId}
				onChange={(storeId) => {
					onChange({ ...value, storeId });
					onStoreChange?.(storeId);
				}}
				onCreateStore={onCreateStore}
			/>

			<ShoppingCategoryPicker
				name="categoryId"
				value={value.categoryId}
				isManual={value.isCategoryManual}
				onChange={(categoryId) => {
					onChange({ ...value, categoryId, isCategoryManual: true });
					onCategoryChange?.();
				}}
			/>
		</>
	);
}
