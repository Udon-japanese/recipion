import { useState } from "react";
import { Button } from "#/components/button/button";
import type { useButtonAction } from "#/components/button/use-button-action";
import { input as fieldInput } from "#/components/field/field.css";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import {
	QuantityInput,
	type QuantityPresetButton,
} from "#/features/quantity/components/quantity-input";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import {
	formatQuantityInput,
	getShareQuantityPresets,
	initialQuantityInput,
} from "#/features/quantity/domain/quantity-buttons";
import type { InventoryListItem } from "../../application/inventory-query-repository";
import type { InventoryOperation } from "../../domain/apply-inventory-adjustment";
import type { InventoryLot } from "../../domain/inventory-lot";
import { listLotAmountUnits } from "../../domain/lot-unit-decrease";
import { readRememberedAmounts } from "../../infrastructure/amount-memory-storage";
import * as styles from "./item-panel.css";

type ButtonStatus = ReturnType<typeof useButtonAction>["status"];

const offlineMessage = "通信できないため、いまは変更できません。";

type AdjustControlsProps = {
	item: InventoryListItem;
	// 量の欄の読み上げる名前。
	label: string;
	// 増減する対象の、いまの量（食材全体か、入れた分）。「今ある分」と、0 のとき「使った」を押せなくするのに使う。
	available: number;
	// 量を打てる単位を決めるロット（換算 1個＝110g があれば、g でも打てる）。
	lots: readonly InventoryLot[];
	quantity: string;
	onQuantityChange: (value: string) => void;
	readOnly: boolean;
	decreaseStatus: ButtonStatus;
	increaseStatus: ButtonStatus;
	// unitLabel：打った量の単位（在庫の単位、またはロットの換算の単位）。
	onRun: (operation: InventoryOperation, unitLabel: string) => void;
};

// 量を打って「使った」「買い足した」を押す欄。パネルの本体と、入れた分の編集で、同じものを使う。
// チップ：「今ある分」、前に打った量（新しい順に3つまで）、今ある分の半分・1/3・1/4（個・玉・本など）、g・ml の足すボタン（+50 など）。
// 単位ごとの固定の端数（1/2 など）は出さない（在庫が増減しても、使える量にならないため）。
// ロットに換算（1個＝110g など）があれば、その単位（g）でも「使った」を打てる。買い足すのは、在庫の単位だけ。
export function AdjustControls({
	item,
	label,
	available,
	lots,
	quantity,
	onQuantityChange,
	readOnly,
	decreaseStatus,
	increaseStatus,
	onRun,
}: AdjustControlsProps) {
	// もう一方のボタンの処理中は、押せない（理由の吹き出しも出さない）。
	const isDecreasing = decreaseStatus === "pending";
	const isIncreasing = increaseStatus === "pending";
	const lotUnits = listLotAmountUnits(lots, item);
	const [chosenUnit, setChosenUnit] = useState(item.stockUnitLabel);
	// 選んだ単位の換算のロットがなくなったら、在庫の単位に戻す。
	const unit = lotUnits.includes(chosenUnit) ? chosenUnit : item.stockUnitLabel;
	const isStockUnit = unit === item.stockUnitLabel;
	const unitCode = isStockUnit
		? item.stockUnitCode
		: unit === "g" || unit === "ml"
			? unit
			: "count";
	const remembered: QuantityPresetButton[] = readRememberedAmounts(
		item.name,
		unit,
	).map((amount) => {
		const text = formatQuantity(amount, {
			grouping: false,
			allowFractions: unitCode === "count",
		});

		return {
			label: `${text}${unit}`,
			value: text,
			ariaLabel: `前に打った量：${text}${unit}にする`,
		};
	});
	const rememberedValues = new Set(
		remembered.map((preset) => parseQuantityInput(preset.value)),
	);
	// 前に打った量と同じ量になる割合のボタンは、重ねて出さない。
	const shares = getShareQuantityPresets(available, item.stockUnitLabel).filter(
		(preset) => !rememberedValues.has(parseQuantityInput(preset.value)),
	);
	// 今ある分・割合は、在庫の単位のときだけ（換算の単位では、ロットごとに量が違うため）。
	const presets: QuantityPresetButton[] = isStockUnit
		? [
				...(available > 0
					? [{ label: "今ある分", value: formatQuantityInput(available) }]
					: []),
				...shares,
				...remembered,
			]
		: remembered;

	return (
		<div className={styles.adjust}>
			<QuantityInput
				className={fieldInput}
				aria-label={label}
				value={quantity}
				onChange={onQuantityChange}
				unitLabel={unit}
				trailing={<span className={styles.unitSuffix}>{unit}</span>}
				presetButtons={presets}
				placeholder={
					!isStockUnit
						? "使った量（例：100）"
						: item.stockUnitCode === "count"
							? "使う量・足す量（例：1）"
							: "使う量・足す量（例：50）"
				}
				hideUnitFractionButtons
			/>

			{lotUnits.length > 0 ? (
				<SegmentedControl
					label="量の単位"
					options={[item.stockUnitLabel, ...lotUnits].map((option) => ({
						value: option,
						label: option,
					}))}
					value={unit}
					onChange={(next) => {
						setChosenUnit(next);
						onQuantityChange(initialQuantityInput(next));
					}}
				/>
			) : null}

			<div className={styles.primaryActions}>
				<Button
					fullWidth
					status={decreaseStatus}
					disabled={readOnly || available === 0 || isIncreasing}
					disabledReason={
						isIncreasing
							? undefined
							: readOnly
								? offlineMessage
								: "在庫が 0 のため、減らせません。"
					}
					onClick={() => onRun("decrease", unit)}
				>
					使った
				</Button>
				<Button
					variant="secondary"
					fullWidth
					status={increaseStatus}
					disabled={readOnly || isDecreasing || !isStockUnit}
					disabledReason={
						isDecreasing
							? undefined
							: readOnly
								? offlineMessage
								: `買い足すときは、${item.stockUnitLabel}で打ってください。`
					}
					onClick={() => onRun("increase", unit)}
				>
					買い足した
				</Button>
			</div>
		</div>
	);
}
