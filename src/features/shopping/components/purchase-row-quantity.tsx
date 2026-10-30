import { TextInput } from "#/components/field/field";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import { Toggle } from "#/components/toggle/toggle";
import {
	type ConversionDraft,
	changeDraftStockUnit,
	getLockedStockUnitCode,
} from "../domain/conversion-draft";
import { describePurchaseResult } from "../domain/describe-purchase-row";
import type { ShoppingItem } from "../domain/shopping-item";
import * as styles from "./purchase-review.css";

const stockUnitOptions = [
	{ value: "count", label: "個数・枚数" },
	{ value: "g", label: "グラム" },
	{ value: "ml", label: "ミリリットル" },
] as const;

type PurchaseRowQuantityProps = {
	item: ShoppingItem;
	// 換算が足りない商品だけ、入力途中の換算がある。
	draft: ConversionDraft | undefined;
	onChange: (draft: ConversionDraft) => void;
	error: string | undefined;
	disabled: boolean;
};

// 「在庫に入れる量」。換算が足りない商品は、入力欄（1つあたりの量・単位・量は数えない）。そろっている商品は、式だけ。
export function PurchaseRowQuantity({
	item,
	draft,
	onChange,
	error,
	disabled,
}: PurchaseRowQuantityProps) {
	if (!draft) {
		const result = describePurchaseResult(item);

		return (
			<p className={styles.result}>
				{result ?? "量は数えない（あるか、ないかだけ見ます）"}
			</p>
		);
	}

	const unit = item.unitLabel?.trim() || "つ";
	const locked = getLockedStockUnitCode(item) !== null;
	const isPresence = draft.trackingMode === "presence";
	const unitSuffix =
		draft.stockUnitCode === "count" ? null : draft.stockUnitCode;

	return (
		<div className={styles.askBox}>
			{isPresence ? (
				<p className={styles.hint}>あるか、ないかだけ見ます</p>
			) : (
				<>
					<div className={styles.askLine}>
						<span className={styles.askWord}>1{unit}は</span>
						<div className={styles.numberInput}>
							<TextInput
								type="number"
								inputMode="decimal"
								min="0"
								step="any"
								placeholder={
									draft.stockUnitCode === "g" ? "例：300" : undefined
								}
								aria-label={`${item.name}の1${unit}あたりの数量`}
								aria-invalid={error ? true : undefined}
								value={draft.stockQuantityPerInputUnit}
								disabled={disabled}
								onChange={(event) =>
									onChange({
										...draft,
										stockQuantityPerInputUnit: event.target.value,
									})
								}
							/>
						</div>

						{unitSuffix ? (
							<span className={styles.askWord}>{unitSuffix}</span>
						) : (
							<div className={styles.labelInput}>
								<TextInput
									aria-label={`${item.name}の表示する単位（個・枚・本など）`}
									value={draft.stockUnitLabel}
									disabled={disabled}
									onChange={(event) =>
										onChange({ ...draft, stockUnitLabel: event.target.value })
									}
								/>
							</div>
						)}
					</div>

					{error ? (
						<p className={styles.rowError} role="alert">
							{error}
						</p>
					) : null}

					<SegmentedControl
						label={`${item.name}の在庫で使う単位`}
						value={draft.stockUnitCode}
						disabled={disabled || locked}
						onChange={(next) =>
							onChange(changeDraftStockUnit(draft, item, next))
						}
						options={stockUnitOptions}
					/>

					{locked ? (
						<p className={styles.hint}>この食材は、単位が決まっています</p>
					) : draft.stockUnitCode === "count" ? (
						<p className={styles.hint}>
							右の欄は、「個」「枚」「本」など、表示する単位です
						</p>
					) : null}
				</>
			)}

			<div className={styles.toggleLine}>
				<Toggle
					label={`${item.name}は量を数えない`}
					checked={isPresence}
					disabled={disabled}
					onChange={(checked) =>
						onChange({
							...draft,
							trackingMode: checked ? "presence" : "estimated",
						})
					}
				/>
				<span className={styles.askWord}>量は数えない</span>
			</div>
		</div>
	);
}
