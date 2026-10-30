import { type SubmitEvent, useId, useState } from "react";
import { Button } from "#/components/button/button";
import { Chip, ChipGroup } from "#/components/chip/chip";
import { Field, TextInput } from "#/components/field/field";
import { Note } from "#/components/note/note";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { Sheet } from "#/components/sheet/sheet";
import { useMediaQuery } from "#/components/use-media-query";
import type { InventoryTrackingMode } from "#/features/inventory/domain/inventory-tracking-mode";
import { formatQuantityForUnit } from "#/features/quantity/domain/format-quantity";
import {
	buildConversionConfiguration,
	changeDraftStockUnit,
	describeConversionDraftError,
	getLockedStockUnitCode,
	initialConversionDraft,
	type ShoppingItemInventoryConfiguration,
} from "../domain/conversion-draft";
import type { ShoppingItem } from "../domain/shopping-item";
import { getShoppingItemPresets } from "../domain/shopping-item-suggestion";
import * as styles from "./shopping-item-inventory-conversion-form.css";

export type { ShoppingItemInventoryConfiguration };

type ShoppingItemInventoryConversionFormProps = {
	item: ShoppingItem;
	isSaving?: boolean;
	onSave(
		configuration: ShoppingItemInventoryConfiguration,
	): void | Promise<void>;
	onCancel(): void;
};

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

export function ShoppingItemInventoryConversionForm({
	item,
	isSaving = false,
	onSave,
	onCancel,
}: ShoppingItemInventoryConversionFormProps) {
	const presets = getShoppingItemPresets(item.name);
	const formId = useId();
	const isRight = useMediaQuery("(min-width: 1024px)");

	const lockedStockUnitCode = getLockedStockUnitCode(item);
	const [draft, setDraft] = useState(() => initialConversionDraft(item));
	const { stockUnitCode, stockUnitLabel, trackingMode } = draft;
	const stockQuantityPerInputUnit = draft.stockQuantityPerInputUnit;

	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	function handleStockUnitChange(value: "count" | "g" | "ml") {
		setDraft((current) => changeDraftStockUnit(current, item, value));
	}

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage(null);

		try {
			await onSave(buildConversionConfiguration(item, draft));
		} catch (error) {
			setErrorMessage(describeConversionDraftError(error));
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
							数え方
						</span>

						<SegmentedControl
							label="数え方"
							value={trackingMode}
							onChange={(next: InventoryTrackingMode) =>
								setDraft((current) => ({ ...current, trackingMode: next }))
							}
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
												setDraft((current) => ({
													...current,
													stockQuantityPerInputUnit: event.target.value,
												}))
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
													setDraft((current) => ({
														...current,
														stockUnitLabel: event.target.value,
													}))
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
