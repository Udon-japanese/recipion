import { useMemo } from "react";
import { Chip } from "#/components/chip/chip";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { toggleMeasureUnit } from "#/features/quantity/domain/measure-units";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import {
	preferMeasureUnit,
	rememberMeasureUnit,
} from "#/features/quantity/infrastructure/measure-unit-preference-storage";
import type { ShoppingItemInventoryConversion } from "../domain/shopping-item";
import {
	listRememberedShoppingChoices,
	type RememberedShoppingChoice,
	type ShoppingMemories,
} from "../domain/shopping-item-memory";
import {
	getShoppingItemPresets,
	isShoppingItemPresetSelected,
} from "../domain/shopping-item-suggestion";
import {
	listShoppingUnitChips,
	toUnitChipKey,
} from "../domain/shopping-unit-chips";
import * as styles from "./shopping-add-sheet.css";

// 数量の欄の下に並べる候補：前の買い方・よく使う数量・よく使う単位。
// 追加・編集のシートと、条件つきのメモの材料で共通。
export type ShoppingAmountChoice = {
	quantity: string;
	unitLabel: string;
	inventoryConversion: ShoppingItemInventoryConversion | null;
};

type ShoppingAmountChoicesProps = {
	itemName: string;
	value: ShoppingAmountChoice;
	// 候補を選んだ・単位を押したあとの、数量・単位・換算。
	onChange: (next: ShoppingAmountChoice) => void;
	// いつもの買い方・換算の記憶。
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
	value: ShoppingAmountChoice,
): boolean {
	return (
		parseQuantityInput(value.quantity) === choice.quantity &&
		value.unitLabel === (choice.unitLabel ?? "") &&
		isSameConversion(value.inventoryConversion, choice.inventoryConversion)
	);
}

export function ShoppingAmountChoices({
	itemName,
	value,
	onChange,
	memories,
}: ShoppingAmountChoicesProps) {
	const rememberedChoices = useMemo(
		() =>
			listRememberedShoppingChoices(
				itemName,
				memories.itemMemories,
				memories.conversionDefaults,
			),
		[itemName, memories],
	);
	// 覚えた候補と同じプリセットは、並べない。
	const presets = getShoppingItemPresets(itemName).filter(
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
				itemName,
				itemMemories: memories.itemMemories,
				conversionDefaults: memories.conversionDefaults,
				preferMeasureUnit: (unit) => preferMeasureUnit(itemName, unit),
			}),
		[itemName, memories],
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

		rememberMeasureUnit(itemName, next);
		onChange({ ...value, unitLabel: next, inventoryConversion: null });
	}

	return (
		<>
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
								onClick={() =>
									onChange({
										quantity: formatQuantity(choice.quantity, {
											grouping: false,
										}),
										unitLabel: choice.unitLabel ?? "",
										inventoryConversion: choice.inventoryConversion,
									})
								}
							>
								{choice.label}
							</Chip>
						))}
						{presets.map((preset) => (
							<Chip
								pressed={isShoppingItemPresetSelected(preset, value)}
								key={preset.label}
								onClick={() =>
									onChange({
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
		</>
	);
}
