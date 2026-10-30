import { useState } from "react";
import { Chip, ChipGroup } from "#/components/chip/chip";
import { TextInput } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import type { IconName } from "#/components/icon/icon-definitions";
import type { ExpiryFieldsValue } from "#/features/inventory/components/expiry-fields";
import {
	formatShortDate,
	storageLabels,
} from "#/features/inventory/domain/expiry-labels";
import {
	addDays,
	type InventoryStorage,
} from "#/features/inventory/domain/inventory-lot";
import * as styles from "./purchase-review.css";

const quickOptions = [
	{ label: "今日", days: 0 },
	{ label: "明日", days: 1 },
	{ label: "3日後", days: 3 },
	{ label: "1週間後", days: 7 },
] as const;

const storageOptions: readonly { value: InventoryStorage; icon: IconName }[] = [
	{ value: "room", icon: "zone-table" },
	{ value: "fridge", icon: "zone-fridge" },
	{ value: "freezer", icon: "zone-freezer" },
];

type CellProps = {
	name: string;
	value: ExpiryFieldsValue;
	onChange: (value: ExpiryFieldsValue) => void;
	disabled: boolean;
};

// 「期限」。日付のボタン（目安か入力かのしるし、×で消す）。押すと、今日・明日などのチップと日付の欄が開く。
export function PurchaseExpiryCell({
	name,
	value,
	onChange,
	today,
	disabled,
}: CellProps & { today: string }) {
	const [isOpen, setIsOpen] = useState(false);

	function setDate(expiresOn: string) {
		onChange({
			...value,
			expiresOn,
			expirySource: expiresOn === "" ? "" : "entered",
		});
	}

	const hasDate = value.expiresOn !== "";
	const isEstimated = value.expirySource === "estimated";

	return (
		<div className={styles.expiryCell}>
			<div className={styles.dateLine}>
				<button
					className={styles.dateButton}
					type="button"
					aria-expanded={isOpen}
					aria-label={`${name}の期限を選ぶ`}
					disabled={disabled}
					data-empty={!hasDate || undefined}
					onClick={() => setIsOpen((open) => !open)}
				>
					<Icon name="calendar" size={16} />
					{hasDate ? (
						<>
							<span>
								{isEstimated ? "約 " : ""}
								{formatShortDate(value.expiresOn)}
							</span>
							<span
								className={styles.tag}
								data-estimated={isEstimated || undefined}
							>
								{isEstimated ? "目安" : "入力"}
							</span>
						</>
					) : (
						<span>日付を選ぶ</span>
					)}
				</button>

				{hasDate ? (
					<button
						className={styles.clearButton}
						type="button"
						aria-label={`${name}の期限を消す`}
						disabled={disabled}
						onClick={() => setDate("")}
					>
						<Icon name="close" size={16} />
					</button>
				) : null}
			</div>

			{isOpen ? (
				<div className={styles.datePicker}>
					<ChipGroup label={`${name}の期限`}>
						{quickOptions.map((option) => (
							<Chip
								key={option.label}
								pressed={value.expiresOn === addDays(today, option.days)}
								disabled={disabled}
								aria-label={`${name}の期限を${option.label}にする`}
								onClick={() => {
									setDate(addDays(today, option.days));
									setIsOpen(false);
								}}
							>
								{option.label}
							</Chip>
						))}
					</ChipGroup>

					<TextInput
						type="date"
						aria-label={`${name}の期限の日付`}
						value={value.expiresOn}
						disabled={disabled}
						onChange={(event) => setDate(event.target.value)}
					/>
				</div>
			) : null}
		</div>
	);
}

// 「しまう場所」。常温・冷蔵・冷凍（選んだものを、もう1度押すと、解除）。
export function PurchaseStorageCell({
	name,
	value,
	onChange,
	disabled,
}: CellProps) {
	return (
		<ChipGroup label={`${name}の保存方法`}>
			{storageOptions.map((option) => (
				<Chip
					key={option.value}
					icon={option.icon}
					pressed={value.storage === option.value}
					disabled={disabled}
					onClick={() =>
						onChange({
							...value,
							storage: value.storage === option.value ? "" : option.value,
						})
					}
				>
					{storageLabels[option.value]}
				</Chip>
			))}
		</ChipGroup>
	);
}
