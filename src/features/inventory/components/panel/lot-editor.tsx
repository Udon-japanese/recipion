import { useState } from "react";
import { Button } from "#/components/button/button";
import { input as fieldInput } from "#/components/field/field.css";
import { Toggle } from "#/components/toggle/toggle";
import { QuantityInput } from "#/features/quantity/components/quantity-input";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import type { InventoryListItem } from "../../application/inventory-query-repository";
import type { InventoryLot } from "../../domain/inventory-lot";
import { ExpiryFields, type ExpiryFieldsValue } from "../expiry-fields";
import * as styles from "./item-panel.css";
import { lotExpiryValue } from "./use-item-panel";

export type LotEdits = {
	quantityText?: string;
	expiry?: ExpiryFieldsValue;
	saveAsDefault?: boolean;
};

type LotEditorProps = {
	item: InventoryListItem;
	lot: InventoryLot;
	// 読み上げる名前（例：「10/1に入れた分」）。
	label: string;
	today: string;
	// 有無だけの食材は、数量を直さない。
	isPresence: boolean;
	// 保存する。成功したら true。
	onSave: (edits: LotEdits) => Promise<boolean>;
	onClose: () => void;
};

// 内訳の1行を、その場で直す（数量・期限・期限の種類・保存方法・食材の初期値）。直したときだけ、送る。
// 期限の欄は、在庫に追加と同じ（保存方法・期限の種類は、1行にたたむ）。
export function LotEditor({
	item,
	lot,
	label,
	today,
	isPresence,
	onSave,
	onClose,
}: LotEditorProps) {
	const initialQuantity = formatQuantity(lot.quantity, {
		grouping: false,
		allowFractions: item.stockUnitCode === "count",
	});
	const initialExpiry = lotExpiryValue(item, lot);
	const [quantityText, setQuantityText] = useState(initialQuantity);
	const [expiry, setExpiry] = useState(initialExpiry);
	const [saveAsDefault, setSaveAsDefault] = useState(false);
	const [isSaving, setIsSaving] = useState(false);

	async function save() {
		const edits: LotEdits = {};

		if (!isPresence && quantityText !== initialQuantity) {
			edits.quantityText = quantityText;
		}

		if (
			saveAsDefault ||
			JSON.stringify(expiry) !== JSON.stringify(initialExpiry)
		) {
			edits.expiry = expiry;
			edits.saveAsDefault = saveAsDefault;
		}

		if (edits.quantityText === undefined && edits.expiry === undefined) {
			onClose();

			return;
		}

		setIsSaving(true);

		const done = await onSave(edits);

		setIsSaving(false);

		if (done) {
			onClose();
		}
	}

	return (
		<div className={styles.lotEditor}>
			{isPresence ? null : (
				<QuantityInput
					className={fieldInput}
					aria-label={`${label}の数量`}
					value={quantityText}
					disabled={isSaving}
					onChange={setQuantityText}
					unitLabel={item.stockUnitLabel}
					trailing={<span>{item.stockUnitLabel}</span>}
				/>
			)}

			<ExpiryFields
				value={expiry}
				onChange={setExpiry}
				today={today}
				disabled={isSaving}
				extraDetails={
					<div className={styles.checkLine}>
						<Toggle
							label="この食材の初期値にする"
							checked={saveAsDefault}
							onChange={setSaveAsDefault}
						/>
						<span aria-hidden="true">
							保存方法・期限の種類をこの食材の初期値にする
						</span>
					</div>
				}
			/>

			<div className={styles.lotEditorActions}>
				<Button
					variant="secondary"
					size="sm"
					disabled={isSaving}
					onClick={onClose}
				>
					やめる
				</Button>
				<Button size="sm" disabled={isSaving} onClick={() => void save()}>
					保存
				</Button>
			</div>
		</div>
	);
}
