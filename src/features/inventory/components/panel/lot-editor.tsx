import { useState } from "react";
import { Button } from "#/components/button/button";
import { useButtonAction } from "#/components/button/use-button-action";
import { Toggle } from "#/components/toggle/toggle";
import { initialQuantityInput } from "#/features/quantity/domain/quantity-buttons";
import type { InventoryListItem } from "../../application/inventory-query-repository";
import type { InventoryOperation } from "../../domain/apply-inventory-adjustment";
import type {
	InventoryLot,
	InventoryLotPurchaseUnit,
} from "../../domain/inventory-lot";
import { lotQuantityInUnit } from "../../domain/lot-unit-decrease";
import {
	parsePurchaseUnitDraft,
	toPurchaseUnitDraft,
} from "../../domain/purchase-unit-draft";
import { ExpiryFields, type ExpiryFieldsValue } from "../expiry-fields";
import { PurchaseUnitField } from "../purchase-unit-field";
import {
	AdjustControls,
	formatAmountInUnit,
	resolveAmountUnit,
} from "./adjust-controls";
import * as styles from "./item-panel.css";
import { type AdjustOptions, lotExpiryValue } from "./use-item-panel";

export type LotEdits = {
	expiry: ExpiryFieldsValue;
	saveAsDefault: boolean;
	// このロットの換算（1個＝110g など）。なしは null。
	purchaseUnit: InventoryLotPurchaseUnit | null;
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
	// 期限・保存方法・換算を直せるか。
	canEditExpiry: boolean;
	// 換算の候補（ほかのロットの換算・買い物メモの記憶）。
	purchaseUnitCandidates: readonly InventoryLotPurchaseUnit[];
	// 「使った」「買い足した」：この入れた分だけを増減する。成功したら true。
	onAdjust: (
		operation: InventoryOperation,
		quantityText: string,
		options: AdjustOptions,
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
	purchaseUnitCandidates,
	onAdjust,
	onSave,
	onClose,
}: LotEditorProps) {
	const initialExpiry = lotExpiryValue(item, lot);
	const [quantityText, setQuantityText] = useState(() =>
		initialQuantityInput(item.stockUnitLabel),
	);
	// 量を打つ単位。在庫の単位でないあいだは、この入れた分の量に、その単位の目安を添える。
	const [chosenUnit, setUnit] = useState(item.stockUnitLabel);
	const unit = resolveAmountUnit(chosenUnit, [lot], item);
	const lotInUnit =
		unit === item.stockUnitLabel ? null : lotQuantityInUnit(lot, unit, item);
	const [expiry, setExpiry] = useState(initialExpiry);
	const [saveAsDefault, setSaveAsDefault] = useState(false);
	const initialPurchaseUnit = toPurchaseUnitDraft(
		lot.purchaseUnit,
		item.stockUnitLabel,
	);
	const [purchaseUnitDraft, setPurchaseUnitDraft] =
		useState(initialPurchaseUnit);
	const [purchaseUnitError, setPurchaseUnitError] = useState<string | null>(
		null,
	);
	const save = useButtonAction();
	const decrease = useButtonAction();
	const increase = useButtonAction();

	function runAdjust(
		operation: InventoryOperation,
		options: { unitLabel: string; remember: boolean },
	) {
		if (decrease.isPending || increase.isPending) {
			return;
		}

		void (operation === "decrease" ? decrease : increase).run(async () => {
			const done = await onAdjust(operation, quantityText, options);

			if (done) {
				setQuantityText(initialQuantityInput(options.unitLabel));
			}

			return done;
		});
	}

	async function saveExpiry() {
		let purchaseUnit: InventoryLotPurchaseUnit | null;

		try {
			purchaseUnit = parsePurchaseUnitDraft(purchaseUnitDraft);
			setPurchaseUnitError(null);
		} catch (error) {
			setPurchaseUnitError(
				error instanceof Error ? error.message : "換算を確認してください",
			);

			return;
		}

		const isChanged =
			saveAsDefault ||
			JSON.stringify(expiry) !== JSON.stringify(initialExpiry) ||
			JSON.stringify(purchaseUnitDraft) !== JSON.stringify(initialPurchaseUnit);

		if (!isChanged) {
			onClose();

			return;
		}

		await save.run(async () => {
			const done = await onSave({ expiry, saveAsDefault, purchaseUnit });

			if (done) {
				onClose();
			}

			return done;
		});
	}

	return (
		<div className={styles.lotEditor}>
			{canAdjust ? (
				<p className={styles.amount}>
					{amountText}
					{lotInUnit === null
						? null
						: `（${formatAmountInUnit(lotInUnit, unit)}）`}
				</p>
			) : null}

			{canAdjust ? (
				<h3 className={styles.sectionTitle}>
					この入れた分の量を増やす・減らす
				</h3>
			) : null}
			{canAdjust ? (
				<p className={styles.sectionNote}>
					「使った」「買い足した」を押すと、すぐ在庫に反映されます。
				</p>
			) : null}

			{canAdjust ? (
				<AdjustControls
					item={item}
					label={`${label}の使った量・買い足した量`}
					available={lot.quantity}
					lots={[lot]}
					unit={unit}
					onUnitChange={setUnit}
					quantity={quantityText}
					onQuantityChange={setQuantityText}
					readOnly={readOnly}
					decreaseStatus={decrease.status}
					increaseStatus={increase.status}
					onRun={runAdjust}
				/>
			) : null}

			{canEditExpiry ? (
				<div className={styles.savedSection}>
					<h3 className={styles.sectionTitle}>期限・保存方法・換算</h3>
					<p className={styles.sectionNote}>
						直したら「保存」を押すと、反映されます。
					</p>
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

					<PurchaseUnitField
						draft={purchaseUnitDraft}
						onChange={setPurchaseUnitDraft}
						candidates={purchaseUnitCandidates}
						quantityUnitOptions={["g", "ml", item.stockUnitLabel]}
						isLabelEditable
						disabled={save.isPending}
						itemName={label}
					/>

					{purchaseUnitError ? (
						<p role="alert" className={styles.hint}>
							{purchaseUnitError}
						</p>
					) : null}

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
				</div>
			) : null}
		</div>
	);
}
