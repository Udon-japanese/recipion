import { useState } from "react";
import { Button } from "#/components/button/button";
import { Chip, ChipGroup } from "#/components/chip/chip";
import { DateField } from "#/components/date-picker/date-picker";
import { TextInput } from "#/components/field/field";
import { formatQuantity } from "#/features/quantity/domain/format-quantity";
import type { InventoryListItem } from "../../application/inventory-query-repository";
import { storageLabels } from "../../domain/expiry-labels";
import type {
	InventoryLot,
	InventoryStorage,
} from "../../domain/inventory-lot";
import * as styles from "./item-panel.css";

const storageOptions: readonly InventoryStorage[] = [
	"room",
	"fridge",
	"freezer",
];

export type LotEdits = {
	quantityText?: string;
	expiry?: { expiresOn: string; storage: InventoryStorage | "" };
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
	// 期限の種類・「この食材の初期値にする」を直す、別の画面。
	onOpenDetails: () => void;
};

// 内訳の1行を、その場で直す（数量・期限・保存方法）。直したときだけ、送る。
export function LotEditor({
	item,
	lot,
	label,
	today,
	isPresence,
	onSave,
	onClose,
	onOpenDetails,
}: LotEditorProps) {
	const initialQuantity = formatQuantity(lot.quantity, {
		grouping: false,
		allowFractions: item.stockUnitCode === "count",
	});
	const [quantityText, setQuantityText] = useState(initialQuantity);
	const [expiresOn, setExpiresOn] = useState(lot.expiresOn ?? "");
	const [storage, setStorage] = useState<InventoryStorage | "">(
		lot.storage ?? "",
	);
	const [isSaving, setIsSaving] = useState(false);

	async function save() {
		const edits: LotEdits = {};

		if (!isPresence && quantityText !== initialQuantity) {
			edits.quantityText = quantityText;
		}

		if (
			expiresOn !== (lot.expiresOn ?? "") ||
			storage !== (lot.storage ?? "")
		) {
			edits.expiry = { expiresOn, storage };
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
				<div className={styles.lotField}>
					<span className={styles.lotFieldLabel}>数量</span>
					<div className={styles.lotQuantityLine}>
						<div className={styles.lotQuantityInput}>
							<TextInput
								inputMode="decimal"
								aria-label={`${label}の数量`}
								value={quantityText}
								disabled={isSaving}
								onChange={(event) => setQuantityText(event.target.value)}
							/>
						</div>
						<span>{item.stockUnitLabel}</span>
					</div>
				</div>
			)}

			<div className={styles.lotField}>
				<span className={styles.lotFieldLabel}>期限</span>
				<DateField
					aria-label={`${label}の期限`}
					value={expiresOn}
					today={today}
					disabled={isSaving}
					onChange={setExpiresOn}
				/>
			</div>

			<div className={styles.lotField}>
				<span className={styles.lotFieldLabel}>しまう場所</span>
				<ChipGroup label={`${label}の保存方法`}>
					{storageOptions.map((option) => (
						<Chip
							key={option}
							pressed={storage === option}
							disabled={isSaving}
							onClick={() => setStorage(storage === option ? "" : option)}
						>
							{storageLabels[option]}
						</Chip>
					))}
				</ChipGroup>
			</div>

			<div className={styles.lotEditorActions}>
				<button
					className={styles.lotDetailsButton}
					type="button"
					disabled={isSaving}
					onClick={onOpenDetails}
				>
					期限の種類・初期値
				</button>
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
