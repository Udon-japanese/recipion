import { useId, useState } from "react";
import { Button } from "#/components/button/button";
import { Chip, ChipGroup } from "#/components/chip/chip";
import { SelectBox, TextInput } from "#/components/field/field";
import { maxStockUnitLabelLength } from "#/features/ingredients/domain/list-stock-unit-options";
import { withLargerMeasureUnits } from "#/features/quantity/domain/measure-units";
import { rememberMeasureUnit } from "#/features/quantity/infrastructure/measure-unit-preference-storage";
import {
	describePurchaseUnitInInputUnit,
	type InventoryLotPurchaseUnit,
} from "../domain/inventory-lot";
import {
	type PurchaseUnitDraft,
	summarizePurchaseUnitDraft,
} from "../domain/purchase-unit-draft";
import * as expiryStyles from "./expiry-fields.css";
import * as styles from "./purchase-unit-field.css";

type PurchaseUnitFieldProps = {
	draft: PurchaseUnitDraft;
	onChange: (draft: PurchaseUnitDraft) => void;
	// 前の換算の候補（ロットの換算・買い物メモの記憶）。
	candidates: readonly InventoryLotPurchaseUnit[];
	// 1つあたりの量の単位の選択肢（g・ml・在庫の単位の呼び名など）。
	quantityUnitOptions: readonly string[];
	// 在庫の単位の呼び名（換算なしのときは、この単位のまま、と出す）。
	stockUnitLabel: string;
	// 買った単位の呼び名を、直せるか。false のときは、呼び名は固定（登録では、在庫の単位）。
	isLabelEditable: boolean;
	disabled?: boolean;
	// 読み上げる食材名（欄の名前に使う）。
	itemName: string;
};

function summarize(draft: PurchaseUnitDraft, stockUnitLabel: string): string {
	try {
		return summarizePurchaseUnitDraft(draft, stockUnitLabel);
	} catch {
		return "入力を確かめてください";
	}
}

// 1つあたりの単位の選択で、「その他」（呼び名を入れる）を選んだときの値。
const otherUnitValue = "other";

// 換算（1個＝110g など）の行。保存方法・期限の種類と同じ、「状態＋［変える］」のたたんだ行で、押すと入力が開く。
// 量を空にすると、換算なし。ロットの数量は変えない（数量は、ほかの欄で決める）。
export function PurchaseUnitField({
	draft,
	onChange,
	candidates,
	quantityUnitOptions,
	stockUnitLabel,
	isLabelEditable,
	disabled = false,
	itemName,
}: PurchaseUnitFieldProps) {
	const [isOpen, setIsOpen] = useState(false);
	const detailsId = useId();
	// g・ml には、kg・L も並べる（在庫には g・ml で入る）。
	const unitOptions = withLargerMeasureUnits(quantityUnitOptions);
	// 選択肢にない単位（枚など）は、「その他」で呼び名を入れる（在庫が袋で「1袋＝6枚」）。
	const isOtherUnit = !unitOptions.includes(draft.quantityUnitLabel);

	return (
		<div className={expiryStyles.group}>
			<button
				className={expiryStyles.detailsToggle}
				type="button"
				aria-expanded={isOpen}
				aria-controls={detailsId}
				onClick={() => setIsOpen(!isOpen)}
			>
				<span className={expiryStyles.detailsTitle}>換算</span>
				<span className={expiryStyles.detailsSummary}>
					{summarize(draft, stockUnitLabel)}
				</span>
				<span className={expiryStyles.detailsAction} aria-hidden="true">
					{isOpen ? "閉じる" : "変える"}
				</span>
			</button>

			{isOpen ? (
				<div className={expiryStyles.details} id={detailsId}>
					{candidates.length > 0 ? (
						<ChipGroup label={`${itemName}の前の換算`}>
							{candidates.map((candidate) => (
								<Chip
									key={describePurchaseUnitInInputUnit(candidate)}
									disabled={disabled}
									onClick={() =>
										onChange({
											label: candidate.label,
											quantityText: String(candidate.quantity),
											quantityUnitLabel: candidate.quantityUnitLabel,
										})
									}
								>
									{describePurchaseUnitInInputUnit(candidate)}
								</Chip>
							))}
						</ChipGroup>
					) : null}

					<div className={styles.line}>
						<span className={styles.word}>1</span>
						{isLabelEditable ? (
							<div className={styles.labelInput}>
								<TextInput
									aria-label={`${itemName}の換算の、買った単位`}
									placeholder="例：個、パック"
									value={draft.label}
									disabled={disabled}
									onChange={(event) =>
										onChange({ ...draft, label: event.target.value })
									}
								/>
							</div>
						) : (
							<span className={styles.word}>{draft.label}</span>
						)}
						<span className={styles.word}>＝</span>
						<div className={styles.numberInput}>
							<TextInput
								inputMode="decimal"
								placeholder="例：200"
								aria-label={`${itemName}の換算の、1つあたりの量`}
								value={draft.quantityText}
								disabled={disabled}
								onChange={(event) =>
									onChange({ ...draft, quantityText: event.target.value })
								}
							/>
						</div>
						<div className={styles.unitSelect}>
							<SelectBox
								aria-label={`${itemName}の換算の、1つあたりの単位`}
								value={isOtherUnit ? otherUnitValue : draft.quantityUnitLabel}
								disabled={disabled}
								onChange={(event) => {
									const value = event.target.value;

									if (value === otherUnitValue) {
										onChange({ ...draft, quantityUnitLabel: "" });

										return;
									}

									// g・kg などは、次の既定にする（この端末だけ）。
									rememberMeasureUnit(itemName, value);
									onChange({ ...draft, quantityUnitLabel: value });
								}}
							>
								{unitOptions.map((option) => (
									<option value={option} key={option}>
										{option}
									</option>
								))}
								<option value={otherUnitValue}>その他</option>
							</SelectBox>
						</div>
						{isOtherUnit ? (
							<div className={styles.labelInput}>
								<TextInput
									aria-label={`${itemName}の換算の、1つあたりの単位の呼び名`}
									placeholder="例：枚"
									maxLength={maxStockUnitLabelLength}
									value={draft.quantityUnitLabel}
									disabled={disabled}
									onChange={(event) =>
										onChange({
											...draft,
											quantityUnitLabel: event.target.value,
										})
									}
								/>
							</div>
						) : null}
					</div>

					<p className={styles.hint}>
						このロットだけの換算です。量を空にすると、在庫の単位のまま（換算なし）になります。
					</p>

					{draft.quantityText !== "" ? (
						<div>
							<Button
								variant="ghost"
								size="sm"
								disabled={disabled}
								onClick={() => onChange({ ...draft, quantityText: "" })}
							>
								換算をなしにする
							</Button>
						</div>
					) : null}
				</div>
			) : null}
		</div>
	);
}
