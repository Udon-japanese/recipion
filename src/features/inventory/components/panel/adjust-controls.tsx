import { Button } from "#/components/button/button";
import type { useButtonAction } from "#/components/button/use-button-action";
import { input as fieldInput } from "#/components/field/field.css";
import {
	QuantityInput,
	type QuantityPresetButton,
} from "#/features/quantity/components/quantity-input";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import { parseQuantityInput } from "#/features/quantity/domain/parse-quantity-input";
import {
	formatQuantityInput,
	getShareQuantityPresets,
} from "#/features/quantity/domain/quantity-buttons";
import type { InventoryListItem } from "../../application/inventory-query-repository";
import type { InventoryOperation } from "../../domain/apply-inventory-adjustment";
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
	quantity: string;
	onQuantityChange: (value: string) => void;
	readOnly: boolean;
	decreaseStatus: ButtonStatus;
	increaseStatus: ButtonStatus;
	onRun: (operation: InventoryOperation) => void;
};

// 量を打って「使った」「買い足した」を押す欄。パネルの本体と、入れた分の編集で、同じものを使う。
// チップ：「今ある分」、前に打った量（新しい順に3つまで）、今ある分の半分・1/3・1/4（個・玉・本など）、g・ml の足すボタン（+50 など）。
// 単位ごとの固定の端数（1/2 など）は出さない（在庫が増減しても、使える量にならないため）。
export function AdjustControls({
	item,
	label,
	available,
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
	const remembered: QuantityPresetButton[] = readRememberedAmounts(
		item.name,
		item.stockUnitLabel,
	).map((amount) => {
		const text = formatQuantity(amount, {
			grouping: false,
			allowFractions: item.stockUnitCode === "count",
		});

		return {
			label: `${text}${item.stockUnitLabel}`,
			value: text,
			ariaLabel: `前に打った量：${text}${item.stockUnitLabel}にする`,
		};
	});
	const rememberedValues = new Set(
		remembered.map((preset) => parseQuantityInput(preset.value)),
	);
	// 前に打った量と同じ量になる割合のボタンは、重ねて出さない。
	const shares = getShareQuantityPresets(available, item.stockUnitLabel).filter(
		(preset) => !rememberedValues.has(parseQuantityInput(preset.value)),
	);
	const presets: QuantityPresetButton[] = [
		...(available > 0
			? [{ label: "今ある分", value: formatQuantityInput(available) }]
			: []),
		...shares,
		...remembered,
	];

	return (
		<div className={styles.adjust}>
			<QuantityInput
				className={fieldInput}
				aria-label={label}
				value={quantity}
				onChange={onQuantityChange}
				unitLabel={item.stockUnitLabel}
				trailing={
					<span className={styles.unitSuffix}>{item.stockUnitLabel}</span>
				}
				presetButtons={presets}
				placeholder={
					item.stockUnitCode === "count"
						? "使う量・足す量（例：1）"
						: "使う量・足す量（例：50）"
				}
				hideUnitFractionButtons
			/>

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
					onClick={() => onRun("decrease")}
				>
					使った
				</Button>
				<Button
					variant="secondary"
					fullWidth
					status={increaseStatus}
					disabled={readOnly || isDecreasing}
					disabledReason={isDecreasing ? undefined : offlineMessage}
					onClick={() => onRun("increase")}
				>
					買い足した
				</Button>
			</div>
		</div>
	);
}
