import { useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { Toggle } from "#/components/toggle/toggle";
import { initialQuantityInput } from "#/features/quantity/domain/quantity-buttons";
import type { InventoryListItem } from "../../application/inventory-query-repository";
import type { InventoryOperation } from "../../domain/apply-inventory-adjustment";
import type { InventoryLot } from "../../domain/inventory-lot";
import { ExpiryFields, type ExpiryFieldsValue } from "../expiry-fields";
import { AdjustControls } from "./adjust-controls";
import * as styles from "./item-panel.css";
import { lotExpiryValue } from "./use-item-panel";

export type LotEdits = {
	expiry: ExpiryFieldsValue;
	saveAsDefault: boolean;
};

type LotEditorProps = {
	item: InventoryListItem;
	lot: InventoryLot;
	// 読み上げる名前（例：「10/1に入れた分」）。
	label: string;
	today: string;
	// この入れた分の、いまの量（「約 300ml」など）。
	amountText: string;
	readOnly: boolean;
	// 量を増減できるか（有無だけの食材は、量を持たない）。
	canAdjust: boolean;
	// 期限・保存方法を直せるか。
	canEditExpiry: boolean;
	// 「使った」「買い足した」：この入れた分だけを増減する。成功したら true。
	onAdjust: (
		operation: InventoryOperation,
		quantityText: string,
	) => Promise<boolean>;
	// 期限などを保存する。成功したら true。
	onSave: (edits: LotEdits) => Promise<boolean>;
	onClose: () => void;
};

// 内訳の1行を、その場で直す。
// 上：量は、パネルの本体と同じく、量を打って「使った」「買い足した」（押したら、すぐ反映。編集は開いたまま）。
// 下：期限・期限の種類・保存方法・食材の初期値は、「保存」で送る（直したときだけ）。
export function LotEditor({
	item,
	lot,
	label,
	today,
	amountText,
	readOnly,
	canAdjust,
	canEditExpiry,
	onAdjust,
	onSave,
	onClose,
}: LotEditorProps) {
	const initialExpiry = lotExpiryValue(item, lot);
	const [quantityText, setQuantityText] = useState(() =>
		initialQuantityInput(item.stockUnitLabel),
	);
	const [expiry, setExpiry] = useState(initialExpiry);
	const [saveAsDefault, setSaveAsDefault] = useState(false);
	const save = useButtonAction();
	const decrease = useButtonAction();
	const increase = useButtonAction();

	function runAdjust(operation: InventoryOperation) {
		if (decrease.isPending || increase.isPending) {
			return;
		}

		void (operation === "decrease" ? decrease : increase).run(async () => {
			const done = await onAdjust(operation, quantityText);

			if (done) {
				setQuantityText(initialQuantityInput(item.stockUnitLabel));
			}

			return done;
		});
	}

	async function saveExpiry() {
		const isChanged =
			saveAsDefault || JSON.stringify(expiry) !== JSON.stringify(initialExpiry);

		if (!isChanged) {
			onClose();

			return;
		}

		await save.run(async () => {
			const done = await onSave({ expiry, saveAsDefault });

			if (done) {
				onClose();
			}

			return done;
		});
	}

	return (
		<div className={styles.lotEditor}>
			{canAdjust ? <p className={styles.amount}>{amountText}</p> : null}

			{canAdjust ? (
				<AdjustControls
					item={item}
					label={`${label}の使った量・買い足した量`}
					available={lot.quantity}
					quantity={quantityText}
					onQuantityChange={setQuantityText}
					readOnly={readOnly}
					decreaseStatus={decrease.status}
					increaseStatus={increase.status}
					onRun={runAdjust}
				/>
			) : null}

			{canEditExpiry ? (
				<>
					<ExpiryFields
						value={expiry}
						onChange={setExpiry}
						today={today}
						disabled={save.isPending}
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
							disabled={save.isPending}
							onClick={onClose}
						>
							やめる
						</Button>
						<Button
							size="sm"
							status={save.status}
							disabled={save.isPending}
							onClick={() => void saveExpiry()}
						>
							保存
						</Button>
					</div>
				</>
			) : null}
		</div>
	);
}
