import { type SubmitEvent, useState } from "react";
import * as v from "valibot";

import type {
	ShoppingItem,
	ShoppingItemInventoryConversion,
} from "../domain/shopping-item";
import { getShoppingItemPresets } from "../domain/shopping-item-suggestion";
import * as styles from "./shopping-item-inventory-conversion-form.css";

export type ShoppingItemInventoryConfiguration = {
	quantity: number;
	unitLabel: string | null;
	inventoryConversion: ShoppingItemInventoryConversion;
};

type ShoppingItemInventoryConversionFormProps = {
	item: ShoppingItem;
	isSaving?: boolean;
	onSave(
		configuration: ShoppingItemInventoryConfiguration,
	): void | Promise<void>;
	onCancel(): void;
};

const genericConversionSchema = v.object({
	stockUnitCode: v.picklist(["count", "g", "ml"]),
	stockUnitLabel: v.pipe(
		v.string(),
		v.trim(),
		v.minLength(1, "在庫の表示単位を入力してください"),
	),
	stockQuantityPerInputUnit: v.pipe(
		v.number(),
		v.finite("換算数量には有限の数値を指定してください"),
		v.gtValue(0, "換算数量は0より大きくしてください"),
	),
	trackingMode: v.picklist(["exact", "estimated"]),
});

function getErrorMessage(error: unknown): string {
	if (v.isValiError(error)) {
		return error.issues[0]?.message ?? "入力内容を確認してください";
	}

	return "換算設定を保存できませんでした";
}

export function ShoppingItemInventoryConversionForm({
	item,
	isSaving = false,
	onSave,
	onCancel,
}: ShoppingItemInventoryConversionFormProps) {
	const presets = getShoppingItemPresets(item.name);

	const [stockUnitCode, setStockUnitCode] = useState<"count" | "g" | "ml">(
		"count",
	);

	const [stockUnitLabel, setStockUnitLabel] = useState(
		item.unitLabel?.trim() || "個",
	);

	const [stockQuantityPerInputUnit, setStockQuantityPerInputUnit] =
		useState("1");

	const [trackingMode, setTrackingMode] = useState<"exact" | "estimated">(
		"estimated",
	);

	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	function handleStockUnitChange(value: "count" | "g" | "ml") {
		setStockUnitCode(value);

		if (value === "g") {
			setStockUnitLabel("g");
			return;
		}

		if (value === "ml") {
			setStockUnitLabel("ml");
			return;
		}

		setStockUnitLabel(item.unitLabel?.trim() || "個");
	}

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage(null);

		try {
			const conversion = v.parse(genericConversionSchema, {
				stockUnitCode,
				stockUnitLabel,
				stockQuantityPerInputUnit: Number(stockQuantityPerInputUnit),
				trackingMode,
			});

			await onSave({
				quantity: item.quantity,
				unitLabel: item.unitLabel,
				inventoryConversion: {
					inputUnitCode: item.unitLabel?.trim() || "unit",
					stockUnitCode: conversion.stockUnitCode,
					stockUnitLabel: conversion.stockUnitLabel,
					stockQuantityPerInputUnit: conversion.stockQuantityPerInputUnit,
					trackingMode: conversion.trackingMode,
				},
			});
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		}
	}

	return (
		<section className={styles.container}>
			<h2 className={styles.title}>{item.name}を在庫へ追加する方法</h2>

			<p className={styles.description}>
				購入した{item.quantity}
				{item.unitLabel ?? "単位"}
				を、在庫ではどの数量として管理するか設定します。
			</p>

			{presets.length > 0 ? (
				<fieldset className={styles.presets}>
					<legend className={styles.legend}>候補から選ぶ</legend>

					<div className={styles.presetList}>
						{presets.map((preset) => (
							<button
								className={styles.presetButton}
								type="button"
								disabled={isSaving}
								key={preset.label}
								onClick={() =>
									void onSave({
										quantity: preset.quantity,
										unitLabel: preset.unitLabel,
										inventoryConversion: preset.inventoryConversion,
									})
								}
							>
								{preset.label}
							</button>
						))}
					</div>
				</fieldset>
			) : null}

			<form className={styles.form} onSubmit={handleSubmit}>
				<p className={styles.formula}>1{item.unitLabel ?? "単位"}あたり</p>

				<label className={styles.field}>
					<span className={styles.label}>在庫で使う単位</span>

					<select
						className={styles.input}
						value={stockUnitCode}
						onChange={(event) =>
							handleStockUnitChange(event.target.value as "count" | "g" | "ml")
						}
					>
						<option value="count">個数・枚数・本数など</option>
						<option value="g">グラム</option>
						<option value="ml">ミリリットル</option>
					</select>
				</label>

				<label className={styles.field}>
					<span className={styles.label}>
						1{item.unitLabel ?? "単位"}あたりの数量
					</span>

					<input
						className={styles.input}
						type="number"
						inputMode="decimal"
						min="0"
						step="any"
						value={stockQuantityPerInputUnit}
						onChange={(event) =>
							setStockQuantityPerInputUnit(event.target.value)
						}
					/>
				</label>

				{stockUnitCode === "count" ? (
					<label className={styles.field}>
						<span className={styles.label}>表示単位</span>

						<input
							className={styles.input}
							value={stockUnitLabel}
							placeholder="個、枚、本など"
							onChange={(event) => setStockUnitLabel(event.target.value)}
						/>
					</label>
				) : null}

				<label className={styles.field}>
					<span className={styles.label}>在庫管理方法</span>

					<select
						className={styles.input}
						value={trackingMode}
						onChange={(event) =>
							setTrackingMode(event.target.value as "exact" | "estimated")
						}
					>
						<option value="estimated">だいたいで管理</option>
						<option value="exact">正確に管理</option>
					</select>
				</label>

				<div className={styles.actions}>
					<button
						className={styles.cancelButton}
						type="button"
						disabled={isSaving}
						onClick={onCancel}
					>
						キャンセル
					</button>

					<button
						className={styles.saveButton}
						type="submit"
						disabled={isSaving}
					>
						設定を保存
					</button>
				</div>

				{errorMessage ? (
					<p className={styles.error} role="alert">
						{errorMessage}
					</p>
				) : null}
			</form>
		</section>
	);
}
