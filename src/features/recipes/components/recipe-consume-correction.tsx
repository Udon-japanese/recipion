import { useState } from "react";
import { Button } from "#/components/button/button";
import { input as fieldInput } from "#/components/field/field.css";
import { Note } from "#/components/note/note";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import type { InventoryLot } from "#/features/inventory/domain/inventory-lot";
import type { InventoryUnitCode } from "#/features/inventory/domain/inventory-unit";
import {
	convertLotUnitAmount,
	listLotAmountUnits,
} from "#/features/inventory/domain/lot-unit-decrease";
import { QuantityInput } from "#/features/quantity/components/quantity-input";
import { formatStockAmountWithUnit } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import {
	formatQuantityInput,
	initialQuantityInput,
} from "#/features/quantity/domain/quantity-buttons";
import * as styles from "./recipe-consume-correction.css";

type RecipeConsumeCorrectionProps = {
	name: string;
	stock: { stockUnitCode: InventoryUnitCode; stockUnitLabel: string };
	// 引く前のロット（換算 1個＝110g があれば、g でも打てる。打った量は、引く順に、この換算で量る）。
	lotsBeforeCooking: readonly InventoryLot[];
	// いま引いている量（在庫の単位）。
	current: number;
	// 引ける量の上限（在庫の単位。引く前の在庫）。
	max: number;
	isWorking: boolean;
	// 直したあとの量（在庫の単位。0 より大きい）。
	onSubmit: (quantity: number) => void;
	// 「使わなかった」：1行の「戻す」と同じ。
	onReturn: () => void;
	onCancel: () => void;
};

const epsilon = 1e-9;

// 「作った」の結果で、引いた量を直す欄。在庫の単位か、ロットの換算の単位で打つ。
export function RecipeConsumeCorrection({
	name,
	stock,
	lotsBeforeCooking,
	current,
	max,
	isWorking,
	onSubmit,
	onReturn,
	onCancel,
}: RecipeConsumeCorrectionProps) {
	const lotUnits = listLotAmountUnits(lotsBeforeCooking, stock);
	const [unit, setUnit] = useState(stock.stockUnitLabel);
	const [quantity, setQuantity] = useState(formatQuantityInput(current));
	const [error, setError] = useState<string | null>(null);

	function handleSubmit() {
		const parsed = parseQuantityInput(quantity);

		if (parsed === null || !(parsed > 0)) {
			setError(
				"量を確かめてください（例：2、0.5、1/2）。使わなかったときは「使わなかった」を押してください",
			);

			return;
		}

		const inStock =
			unit === stock.stockUnitLabel
				? parsed
				: convertLotUnitAmount(
						lotsBeforeCooking,
						{ quantity: parsed, unitLabel: unit },
						stock,
					);

		if (inStock === null) {
			setError(
				`${unit}から${stock.stockUnitLabel}に直せませんでした。${stock.stockUnitLabel}で打ってください`,
			);

			return;
		}

		if (inStock > max + epsilon) {
			setError(
				`在庫は${formatStockAmountWithUnit(max, stock.stockUnitCode, stock.stockUnitLabel)}までです`,
			);

			return;
		}

		setError(null);

		if (Math.abs(inStock - current) <= epsilon) {
			onCancel();

			return;
		}

		onSubmit(inStock);
	}

	return (
		<div className={styles.editor}>
			<QuantityInput
				className={fieldInput}
				aria-label={`${name}の使った量`}
				value={quantity}
				onChange={setQuantity}
				unitLabel={unit}
				trailing={<span className={styles.unitSuffix}>{unit}</span>}
				hideUnitFractionButtons
			/>
			{lotUnits.length > 0 ? (
				<SegmentedControl
					label="量の単位"
					options={[stock.stockUnitLabel, ...lotUnits].map((option) => ({
						value: option,
						label: option,
					}))}
					value={unit}
					onChange={(next) => {
						setUnit(next);
						setQuantity(
							next === stock.stockUnitLabel
								? formatQuantityInput(current)
								: initialQuantityInput(next),
						);
					}}
				/>
			) : null}
			{error ? <Note tone="error">{error}</Note> : null}
			<div className={styles.actions}>
				<Button size="sm" disabled={isWorking} onClick={handleSubmit}>
					この量にする
				</Button>
				<Button
					variant="secondary"
					size="sm"
					disabled={isWorking}
					onClick={onReturn}
				>
					使わなかった
				</Button>
				<Button
					variant="ghost"
					size="sm"
					disabled={isWorking}
					onClick={onCancel}
				>
					やめる
				</Button>
			</div>
		</div>
	);
}
