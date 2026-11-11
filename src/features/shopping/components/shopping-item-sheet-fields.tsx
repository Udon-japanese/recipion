import { useMemo, useState } from "react";
import { Button } from "#/components/button/button";
import { Chip } from "#/components/chip/chip";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { toggleMeasureUnit } from "#/features/quantity/domain/measure-units";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import {
	preferMeasureUnit,
	rememberMeasureUnit,
} from "#/features/quantity/infrastructure/measure-unit-preference-storage";
import {
	isShoppingCategoryId,
	type ShoppingCategoryId,
	shoppingCategories,
} from "../domain/shopping-category";
import type { ShoppingItemInventoryConversion } from "../domain/shopping-item";
import type {
	RememberedShoppingChoice,
	ShoppingMemories,
} from "../domain/shopping-item-memory";
import {
	getShoppingItemPresets,
	inferShoppingCategory,
	isShoppingItemPresetSelected,
} from "../domain/shopping-item-suggestion";
import type { ShoppingStore } from "../domain/shopping-store";
import {
	listShoppingUnitChips,
	toUnitChipKey,
} from "../domain/shopping-unit-chips";
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
	// 数量・単位・換算を、自分で決めたとき（入力・チップ）。
	onAmountChange?: () => void;
	// カテゴリを、自分で選んだとき。
	onCategoryChange?: () => void;
	// 覚えた買い方の候補（新しい順）。よく使う数量の前に並べる。
	rememberedChoices?: readonly RememberedShoppingChoice[];
	// いつもの買い方・換算の記憶（単位のチップを、食材ごとに並べる）。
	memories: ShoppingMemories;
};

function isSameConversion(
	a: ShoppingItemInventoryConversion | null,
	b: ShoppingItemInventoryConversion | null,
): boolean {
	return (
		a?.inputUnitCode === b?.inputUnitCode &&
		a?.stockUnitCode === b?.stockUnitCode &&
		a?.stockQuantityPerInputUnit === b?.stockQuantityPerInputUnit &&
		a?.trackingMode === b?.trackingMode
	);
}

function isRememberedChoiceSelected(
	choice: RememberedShoppingChoice,
	value: ShoppingItemDraft,
): boolean {
	return (
		parseQuantityInput(value.quantity) === choice.quantity &&
		value.unitLabel === (choice.unitLabel ?? "") &&
		isSameConversion(value.inventoryConversion, choice.inventoryConversion)
	);
}

const noChoices: readonly RememberedShoppingChoice[] = [];

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
	rememberedChoices = noChoices,
	memories,
}: ShoppingItemSheetFieldsProps) {
	const [isChangingCategory, setIsChangingCategory] = useState(false);
	const allPresets = getShoppingItemPresets(value.name);
	// 覚えた候補と同じプリセットは、並べない。
	const presets = allPresets.filter(
		(preset) =>
			!rememberedChoices.some(
				(choice) =>
					choice.quantity === preset.quantity &&
					(choice.unitLabel ?? "") === preset.unitLabel &&
					isSameConversion(
						choice.inventoryConversion,
						preset.inventoryConversion,
					),
			),
	);
	// 単位を、入力かチップで決めたか。
	const isUnitChosen = value.unitLabel.trim() !== "";
	const chosenKey = isUnitChosen ? toUnitChipKey(value.unitLabel) : null;
	// 単位のチップは、前の買い方のチップと別の行。同じ単位があっても並べる（単位だけを選ぶ・g ⇄ kg を押すため）。
	const unitChips = useMemo(
		() =>
			listShoppingUnitChips({
				itemName: value.name,
				itemMemories: memories.itemMemories,
				conversionDefaults: memories.conversionDefaults,
				preferMeasureUnit: (unit) => preferMeasureUnit(value.name, unit),
			}),
		[value.name, memories],
	);
	// 決めるまでは並べる。決めたあとも、選んだ単位が並びにあれば残す（g ⇄ kg を押せるように）。
	const units =
		chosenKey === null ||
		unitChips.some((unit) => toUnitChipKey(unit) === chosenKey)
			? unitChips
			: [];

	function chooseUnit(unit: string) {
		const isChosen = chosenKey !== null && toUnitChipKey(unit) === chosenKey;
		// 選んでいる重さ・体積のチップを、もう一度押したら、g ⇄ kg・ml ⇄ L（打った数は、そのまま）。
		const next = isChosen
			? (toggleMeasureUnit(value.unitLabel) ?? value.unitLabel)
			: unit;

		if (next === value.unitLabel) {
			return;
		}

		rememberMeasureUnit(value.name, next);
		onChange({ ...value, unitLabel: next, inventoryConversion: null });
		onAmountChange?.();
	}
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

			{rememberedChoices.length > 0 || presets.length > 0 ? (
				<fieldset className={styles.group}>
					<legend className={styles.groupLabel}>
						{rememberedChoices.length > 0
							? "前の買い方・よく使う数量"
							: "よく使う数量"}
					</legend>

					<div className={styles.chips}>
						{rememberedChoices.map((choice) => (
							<Chip
								pressed={isRememberedChoiceSelected(choice, value)}
								key={`remembered-${choice.label}`}
								onClick={() => {
									onChange({
										...value,
										quantity: formatQuantity(choice.quantity, {
											grouping: false,
										}),
										unitLabel: choice.unitLabel ?? "",
										inventoryConversion: choice.inventoryConversion,
									});
									onAmountChange?.();
								}}
							>
								{choice.label}
							</Chip>
						))}
						{presets.map((preset) => (
							<Chip
								pressed={isShoppingItemPresetSelected(preset, value)}
								key={preset.label}
								onClick={() => {
									onChange({
										...value,
										quantity: formatQuantity(preset.quantity, {
											grouping: false,
										}),
										unitLabel: preset.unitLabel,
										inventoryConversion: preset.inventoryConversion,
									});
									onAmountChange?.();
								}}
							>
								{preset.label}
							</Chip>
						))}
					</div>
				</fieldset>
			) : null}

			{units.length > 0 ? (
				<fieldset className={styles.group}>
					<legend className={styles.groupLabel}>よく使う単位</legend>

					<div className={styles.chips}>
						{units.map((unit) => {
							const isChosen = toUnitChipKey(unit) === chosenKey;

							return (
								<Chip
									pressed={isChosen}
									key={`unit-${toUnitChipKey(unit)}`}
									onClick={() => chooseUnit(unit)}
								>
									{/* 選んでいるチップは、選んだ単位の文字（g を選んだあとに押すと kg）。 */}
									{isChosen ? value.unitLabel.trim() : unit}
								</Chip>
							);
						})}
					</div>
				</fieldset>
			) : null}

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
					onChange={(categoryId) => {
						onChange({
							...value,
							categoryId: isShoppingCategoryId(categoryId) ? categoryId : "",
							isCategoryManual: true,
						});
						onCategoryChange?.();
					}}
				/>
			) : null}
		</>
	);
}
