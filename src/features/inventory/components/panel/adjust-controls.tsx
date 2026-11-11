import { useState } from "react";
import { Button } from "#/components/button/button";
import type { useButtonAction } from "#/components/button/use-button-action";
import { input as fieldInput } from "#/components/field/field.css";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import {
	QuantityInput,
	type QuantityPresetButton,
} from "#/features/quantity/components/quantity-input";
import {
	formatQuantity,
	formatStockAmountWithUnit,
} from "#/features/quantity/domain/format-quantity";
import {
	findMeasureUnit,
	largerMeasureFactor,
	toBaseMeasureUnit,
	toggleMeasureUnit,
} from "#/features/quantity/domain/measure-units";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import {
	formatQuantityInput,
	getShareQuantityPresets,
	initialQuantityInput,
} from "#/features/quantity/domain/quantity-buttons";
import {
	preferMeasureUnit,
	rememberMeasureUnit,
} from "#/features/quantity/infrastructure/measure-unit-preference-storage";
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
	// 選んだ量の単位（resolveAmountUnit で、使える単位に直したもの）。パネルの量の表示にも使うので、呼び出し側で持つ。
	unit: string;
	onUnitChange: (unit: string) => void;
	quantity: string;
	onQuantityChange: (value: string) => void;
	readOnly: boolean;
	decreaseStatus: ButtonStatus;
	increaseStatus: ButtonStatus;
	// unitLabel：打った量の単位（在庫の単位、またはロットの換算の単位）。
	// remember：打った量を、次のチップのために覚えるか（今ある分・半分などのチップで入れた量は、覚えない）。
	onRun: (
		operation: InventoryOperation,
		options: { unitLabel: string; remember: boolean },
	) => void;
};

/** 換算の単位での量の表示（330g、3玉、1.2kg）。g・ml は丸め、ほかは個数と同じく分数か小数第1位まで。 */
export function formatAmountInUnit(quantity: number, unit: string): string {
	return formatStockAmountWithUnit(
		quantity,
		unit === "g" || unit === "ml" ? unit : "count",
		unit,
	);
}

/**
 * 選んだ量の単位を、使える単位にする（在庫の単位か、ロットの換算の単位。g・ml なら kg・L でもよい）。
 * 換算のロットがなくなっていたら、在庫の単位。
 */
export function resolveAmountUnit(
	chosen: string,
	lots: readonly InventoryLot[],
	item: Pick<InventoryListItem, "stockUnitCode" | "stockUnitLabel">,
): string {
	const base = toBaseMeasureUnit(chosen);

	return base === item.stockUnitLabel ||
		listLotAmountUnits(lots, item).includes(base)
		? chosen
		: item.stockUnitLabel;
}

// 量を打って「使った」「買い足した」を押す欄。パネルの本体と、入れた分の編集で、同じものを使う。
// チップ：「今ある分」、前に打った量（新しい順に3つまで）、今ある分の半分・1/3・1/4（個・玉・本など）、g・ml の足すボタン（+50 など）。
// 単位ごとの固定の端数（1/2 など）は出さない（在庫が増減しても、使える量にならないため）。
// ロットに換算（1個＝110g など）があれば、その単位（g）でも「使った」を打てる。買い足すのは、在庫の単位だけ。
export function AdjustControls({
	item,
	label,
	available,
	lots,
	unit,
	onUnitChange,
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
	// 今ある分・割合のチップで入れた量（そのまま押したら、覚えない）。
	const [fixedChipValue, setFixedChipValue] = useState<string | null>(null);
	// kg・L は、g・ml と同じ単位として扱う（打った量を、1000 倍して引く）。
	const baseUnit = toBaseMeasureUnit(unit);
	const isStockUnit = baseUnit === item.stockUnitLabel;
	const unitScale = findMeasureUnit(unit)?.isLarger ? largerMeasureFactor : 1;
	const unitCode = isStockUnit
		? item.stockUnitCode
		: baseUnit === "g" || baseUnit === "ml"
			? baseUnit
			: "count";
	// 押すと g ⇄ kg・ml ⇄ L（打った数は、そのまま）。
	const toggledUnit = toggleMeasureUnit(unit);
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
	const shares = getShareQuantityPresets(available, item.stockUnitLabel);
	const wholeAndShares: QuantityPresetButton[] = [
		...(available > 0
			? [
					{
						label: "今ある分",
						value: formatQuantityInput(available / unitScale),
					},
				]
			: []),
		...shares,
	].map((preset) => ({
		...preset,
		onSelect: () => setFixedChipValue(preset.value),
	}));
	const run = (operation: InventoryOperation) =>
		onRun(operation, {
			unitLabel: unit,
			remember: !(isStockUnit && quantity === fixedChipValue),
		});
	const fixedValues = new Set(
		wholeAndShares.map((preset) => parseQuantityInput(preset.value)),
	);
	// 今ある分・割合は、在庫の単位のときだけ（換算の単位では、ロットごとに量が違うため）。
	// 並びは、今ある分 → 半分 → 1/3 → 1/4 → 前に打った量で固定。同じ量になる「前に打った量」は、重ねて出さない。
	const presets: QuantityPresetButton[] = isStockUnit
		? [
				...wholeAndShares,
				...remembered.filter(
					(preset) => !fixedValues.has(parseQuantityInput(preset.value)),
				),
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
				trailing={
					toggledUnit ? (
						<Button
							variant="ghost"
							size="sm"
							aria-label={`量の単位を${toggledUnit}にする（いまは${unit}）`}
							onClick={() => {
								rememberMeasureUnit(item.name, toggledUnit);
								onUnitChange(toggledUnit);
							}}
						>
							{unit}
						</Button>
					) : (
						<span className={styles.unitSuffix}>{unit}</span>
					)
				}
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
					value={baseUnit}
					onChange={(next) => {
						// g・ml は、その食材で最後に選んだ方（kg・L）で打つ。
						const preferred = preferMeasureUnit(item.name, next);

						onUnitChange(preferred);
						onQuantityChange(initialQuantityInput(preferred));
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
					onClick={() => run("decrease")}
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
					onClick={() => run("increase")}
				>
					買い足した
				</Button>
			</div>
		</div>
	);
}
