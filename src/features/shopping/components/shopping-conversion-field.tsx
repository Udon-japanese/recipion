import { Button } from "#/components/button/button";
import {
	type AmountDraft,
	applyAmountPreset,
	buildAmountConfiguration,
	initialAmountDraft,
} from "../domain/amount-draft";
import { inferInventoryConversion } from "../domain/infer-inventory-conversion";
import { describeConversionDefault } from "../domain/shopping-conversion-default";
import type {
	ShoppingItem,
	ShoppingItemInventoryConversion,
} from "../domain/shopping-item";
import { PurchaseRowQuantity } from "./purchase-row-quantity";
import * as styles from "./shopping-add-sheet.css";

// 換算の入力（「変える」を押してから）。閉じても、直した内容は残す（保存すると、それが入る）。
export type ConversionEdit = {
	amount: AmountDraft;
	isOpen: boolean;
	// 入力を直したか（開いただけなら、換算は元のまま）。
	isEdited: boolean;
};

// いまの換算。名前・単位を変えて外れたときは、保存のときに決まる換算（カタログからの推定）。
export function currentConversion(
	item: ShoppingItem,
): ShoppingItemInventoryConversion | null {
	return (
		item.inventoryConversion ??
		inferInventoryConversion(item.name, item.unitLabel)
	);
}

// 換算の入力を、いまの換算から始める（なければ、食材に合わせた初期の形）。
export function openConversionEdit(item: ShoppingItem): ConversionEdit {
	const conversion = currentConversion(item);

	return {
		amount: conversion
			? {
					...applyAmountPreset({
						quantity: item.quantity,
						unitLabel: item.unitLabel,
						inventoryConversion: conversion,
					}),
					preset: undefined,
				}
			: initialAmountDraft(item),
		isOpen: true,
		isEdited: false,
	};
}

// 直した換算（直していなければ null）。入力が読めないときは、理由つきで throw する。
export function resolveEditedConversion(
	item: ShoppingItem,
	edit: ConversionEdit | null,
): ShoppingItemInventoryConversion | null {
	return edit?.isEdited
		? buildAmountConfiguration(item, edit.amount).inventoryConversion
		: null;
}

function tryResolve(item: ShoppingItem, edit: ConversionEdit) {
	try {
		return resolveEditedConversion(item, edit);
	} catch {
		return undefined;
	}
}

type ShoppingConversionFieldProps = {
	// 入力中の内容で見た項目（名前・単位・数量・いまの換算）。
	item: ShoppingItem;
	edit: ConversionEdit | null;
	onEditChange: (next: ConversionEdit) => void;
	error?: string;
	disabled?: boolean;
};

// 「在庫では 1パック＝300g ［変える］」の行と、押すと開く、換算の入力（購入確定と同じ部品）。
export function ShoppingConversionField({
	item,
	edit,
	onEditChange,
	error,
	disabled = false,
}: ShoppingConversionFieldProps) {
	const edited = edit?.isEdited ? tryResolve(item, edit) : null;
	const conversion = edit?.isEdited ? edited : currentConversion(item);
	const isAutomatic =
		!edit?.isEdited && !item.inventoryConversion && conversion !== null;

	return (
		<>
			<div className={styles.category}>
				<span className={styles.categoryKey}>在庫では</span>
				<span className={styles.categoryValue}>
					{conversion
						? describeConversionDefault({
								unitLabel: item.unitLabel,
								inventoryConversion: conversion,
							})
						: conversion === undefined
							? "入力を確かめてください"
							: "未設定"}
				</span>
				{isAutomatic ? <span className={styles.auto}>自動</span> : null}
				<Button
					variant="ghost"
					size="sm"
					onClick={() =>
						onEditChange(
							edit
								? { ...edit, isOpen: !edit.isOpen }
								: openConversionEdit(item),
						)
					}
				>
					{edit?.isOpen ? "閉じる" : conversion ? "変える" : "決める"}
				</Button>
			</div>

			{edit?.isOpen ? (
				<PurchaseRowQuantity
					item={item}
					draft={edit.amount}
					onChange={(amount) =>
						onEditChange({ ...edit, amount, isEdited: true })
					}
					error={error}
					disabled={disabled}
					hidePresets
				/>
			) : null}
		</>
	);
}
