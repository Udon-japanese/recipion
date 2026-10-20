import { type SubmitEvent, useId, useState } from "react";
import * as v from "valibot";
import { Button } from "#/components/button/button";
import { Chip, ChipGroup } from "#/components/chip/chip";
import { Field, TextInput } from "#/components/field/field";
import { Note } from "#/components/note/note";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { Sheet } from "#/components/sheet/sheet";
import { useMediaQuery } from "#/components/use-media-query";
import {
	findIngredientCatalogEntry,
	getDefaultStockUnitLabel,
} from "#/features/ingredients/domain/ingredient-catalog";
import {
	type InventoryTrackingMode,
	inventoryTrackingModeSchema,
} from "#/features/inventory/domain/inventory-tracking-mode";
import { formatQuantityForUnit } from "#/features/quantity/domain/format-quantity";

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
	trackingMode: inventoryTrackingModeSchema,
});

const trackingModeOptions: readonly {
	value: InventoryTrackingMode;
	label: string;
}[] = [
	{ value: "estimated", label: "だいたい" },
	{ value: "exact", label: "正確" },
	{ value: "presence", label: "有無だけ" },
];

const stockUnitOptions: readonly {
	value: "count" | "g" | "ml";
	label: string;
}[] = [
	{ value: "count", label: "個数・枚数" },
	{ value: "g", label: "グラム" },
	{ value: "ml", label: "ミリリットル" },
];

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
	const formId = useId();
	const isRight = useMediaQuery("(min-width: 1024px)");

	// 数量プリセットのある食材は、在庫の単位が決まっている（在庫の登録がカタログの単位に固定するため、
	// ここで別の単位を選ぶと、数量が狂う）。
	const catalogEntry = findIngredientCatalogEntry(item.name);
	const lockedStockUnitCode =
		catalogEntry && (catalogEntry.presets?.length ?? 0) > 0
			? catalogEntry.stockUnitCode
			: null;

	// すでに換算がある項目（行の換算を押して直すとき）は、その値から始める。
	// ない項目は、カタログの在庫の単位から始める（「袋」のまま g の数量を入れて、800袋になるのを防ぐ）。
	const existing = item.inventoryConversion;
	const initialStockUnitCode =
		lockedStockUnitCode ??
		existing?.stockUnitCode ??
		catalogEntry?.stockUnitCode ??
		"count";

	const [stockUnitCode, setStockUnitCode] = useState<"count" | "g" | "ml">(
		initialStockUnitCode,
	);

	const [stockUnitLabel, setStockUnitLabel] = useState(
		initialStockUnitCode === "count"
			? existing?.stockUnitCode === "count"
				? existing.stockUnitLabel
				: item.unitLabel?.trim() || "個"
			: getDefaultStockUnitLabel(initialStockUnitCode),
	);

	const [stockQuantityPerInputUnit, setStockQuantityPerInputUnit] = useState(
		existing && existing.trackingMode !== "presence"
			? String(existing.stockQuantityPerInputUnit)
			: "1",
	);

	const [trackingMode, setTrackingMode] = useState<InventoryTrackingMode>(
		existing?.trackingMode ??
			(catalogEntry && lockedStockUnitCode
				? catalogEntry.defaultTrackingMode
				: "estimated"),
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
			// 有無だけは、量の換算がいらない（「ある」になるだけ）。
			if (trackingMode === "presence") {
				await onSave({
					quantity: item.quantity,
					unitLabel: item.unitLabel,
					inventoryConversion: {
						inputUnitCode: item.unitLabel?.trim() || "unit",
						stockUnitCode: lockedStockUnitCode ?? "count",
						stockUnitLabel: lockedStockUnitCode
							? getDefaultStockUnitLabel(lockedStockUnitCode)
							: "個",
						stockQuantityPerInputUnit: 1,
						trackingMode: "presence",
					},
				});

				return;
			}

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
					// g・ml は表示単位が決まっている（「袋」のまま g の数量を入れて、800袋と表示されるのを防ぐ）。
					stockUnitLabel:
						conversion.stockUnitCode === "count"
							? conversion.stockUnitLabel
							: getDefaultStockUnitLabel(conversion.stockUnitCode),
					stockQuantityPerInputUnit: conversion.stockQuantityPerInputUnit,
					trackingMode: conversion.trackingMode,
				},
			});
		} catch (error) {
			setErrorMessage(getErrorMessage(error));
		}
	}

	return (
		<Sheet
			open
			onOpenChange={(open) => {
				if (!open && !isSaving) {
					onCancel();
				}
			}}
			title={`${item.name}の設定`}
			placement={isRight ? "right" : "bottom"}
			dismissible={!isSaving}
			footer={
				<div className={styles.actions}>
					<Button
						variant="secondary"
						size="lg"
						fullWidth
						disabled={isSaving}
						onClick={onCancel}
					>
						キャンセル
					</Button>

					<Button
						size="lg"
						fullWidth
						type="submit"
						form={formId}
						disabled={isSaving}
					>
						設定を保存
					</Button>
				</div>
			}
		>
			<div className={styles.container}>
				<Note tone="warn">{item.name}の在庫換算を設定してください</Note>

				<div className={styles.intro}>
					<h3 className={styles.title}>{item.name}を在庫へ追加する方法</h3>

					<p className={styles.description}>
						購入した{formatQuantityForUnit(item.quantity, item.unitLabel)}
						{item.unitLabel ?? "単位"}
						を、在庫ではどの数量として管理するか設定します。
					</p>
				</div>

				{presets.length > 0 ? (
					<div className={styles.group}>
						<span className={styles.groupLabel} aria-hidden="true">
							候補から選ぶ
						</span>

						<ChipGroup label="候補から選ぶ">
							{presets.map((preset) => (
								<Chip
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
								</Chip>
							))}
						</ChipGroup>
					</div>
				) : null}

				<form className={styles.form} id={formId} onSubmit={handleSubmit}>
					<div className={styles.group}>
						<span className={styles.groupLabel} aria-hidden="true">
							在庫管理方法
						</span>

						<SegmentedControl
							label="在庫管理方法"
							value={trackingMode}
							onChange={setTrackingMode}
							options={trackingModeOptions}
						/>
					</div>

					{trackingMode !== "presence" ? (
						<>
							<div className={styles.group}>
								<span className={styles.groupLabel} aria-hidden="true">
									在庫で使う単位
								</span>

								<SegmentedControl
									label="在庫で使う単位"
									value={stockUnitCode}
									onChange={handleStockUnitChange}
									disabled={lockedStockUnitCode !== null}
									options={stockUnitOptions}
								/>

								{lockedStockUnitCode !== null ? (
									<p className={styles.description}>
										{item.name}
										の在庫の単位は、決まっています（変更できません）。
									</p>
								) : null}
							</div>

							<div className={styles.two}>
								<Field label={`1${item.unitLabel ?? "単位"}あたりの数量`}>
									{(control) => (
										<TextInput
											{...control}
											type="number"
											inputMode="decimal"
											min="0"
											step="any"
											value={stockQuantityPerInputUnit}
											onChange={(event) =>
												setStockQuantityPerInputUnit(event.target.value)
											}
										/>
									)}
								</Field>

								{stockUnitCode === "count" ? (
									<Field label="表示単位">
										{(control) => (
											<TextInput
												{...control}
												value={stockUnitLabel}
												placeholder="個、枚、本など"
												onChange={(event) =>
													setStockUnitLabel(event.target.value)
												}
											/>
										)}
									</Field>
								) : null}
							</div>
						</>
					) : null}

					{errorMessage ? <Note tone="error">{errorMessage}</Note> : null}
				</form>
			</div>
		</Sheet>
	);
}
