import { type ReactNode, useId, useState } from "react";
import { Chip, ChipGroup } from "#/components/chip/chip";
import { DateField } from "#/components/date-picker/date-picker";
import { Field } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import type { IconName } from "#/components/icon/icon-definitions";
import {
	type ExpiryFieldsValue,
	emptyExpiryFields,
} from "../domain/build-expiry-prefill";
import { expiryKindLabels, storageLabels } from "../domain/expiry-labels";
import type {
	InventoryExpiryKind,
	InventoryExpirySource,
	InventoryStorage,
} from "../domain/inventory-lot";
import * as styles from "./expiry-fields.css";

export { type ExpiryFieldsValue, emptyExpiryFields };

type ExpiryFieldsProps = {
	value: ExpiryFieldsValue;
	onChange: (value: ExpiryFieldsValue) => void;
	// 「今日」を基準にするクイック入力のための、今日の日付（YYYY-MM-DD）。
	today: string;
	disabled?: boolean;
	// たたんだ行に、保存方法・期限の種類と一緒にまとめる、ほかの欄（在庫に追加の、数え方など）。
	detailsTitle?: string;
	extraSummary?: string;
	extraDetails?: ReactNode;
};

const storageOptions: readonly {
	value: InventoryStorage;
	label: string;
	icon: IconName;
}[] = [
	{ value: "room", label: storageLabels.room, icon: "zone-table" },
	{ value: "fridge", label: storageLabels.fridge, icon: "zone-fridge" },
	{ value: "freezer", label: storageLabels.freezer, icon: "zone-freezer" },
];

const kindOptions: readonly {
	value: InventoryExpiryKind;
	label: string;
}[] = [
	{ value: "use-by", label: expiryKindLabels["use-by"] },
	{ value: "best-before", label: expiryKindLabels["best-before"] },
	{ value: "none", label: expiryKindLabels.none },
];

// 期限（日付・消費/賞味）と、保存方法の入力欄。すべて任意。
// 日付をユーザーが入れる（クイック入力を含む）と、出所は「入力」になる。自動の目安は、「約」と示す。
// 保存方法・期限の種類は、1行の要約にたたみ、「変える」で開く。選んだチップをもう一度押すと、外れる。
export function ExpiryFields({
	value,
	onChange,
	today,
	disabled,
	detailsTitle = "保存方法・期限の種類",
	extraSummary,
	extraDetails,
}: ExpiryFieldsProps) {
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);
	const detailsId = useId();

	function setDate(expiresOn: string) {
		onChange({
			...value,
			expiresOn,
			expirySource: expiresOn === "" ? "" : "entered",
		});
	}

	return (
		<div className={styles.container}>
			<div className={styles.group}>
				<Field label="期限">
					{(control) => (
						<DateField
							{...control}
							value={value.expiresOn}
							today={today}
							disabled={disabled}
							onChange={setDate}
						/>
					)}
				</Field>
			</div>

			{value.expirySource === "estimated" && value.expiresOn !== "" ? (
				<p className={styles.estimateNote}>
					<Icon name="info-circle" size={16} />
					目安（約）の日付です。袋やパックの日付があれば、そちらに直してください。
				</p>
			) : null}

			<div className={styles.group}>
				<button
					className={styles.detailsToggle}
					type="button"
					aria-expanded={isDetailsOpen}
					aria-controls={detailsId}
					onClick={() => setIsDetailsOpen(!isDetailsOpen)}
				>
					<span className={styles.detailsTitle}>{detailsTitle}</span>
					<span className={styles.detailsSummary}>
						{summarizeDetails(value, extraSummary)}
					</span>
					<span className={styles.detailsAction} aria-hidden="true">
						{isDetailsOpen ? "閉じる" : "変える"}
					</span>
				</button>

				{isDetailsOpen ? (
					<div className={styles.details} id={detailsId}>
						<div className={styles.group}>
							<span className={styles.groupLabel} aria-hidden="true">
								保存方法
							</span>

							<ChipGroup label="保存方法">
								{storageOptions.map((option) => (
									<Chip
										key={option.value}
										pressed={value.storage === option.value}
										icon={option.icon}
										disabled={disabled}
										onClick={() =>
											onChange({
												...value,
												storage:
													value.storage === option.value ? "" : option.value,
											})
										}
									>
										{option.label}
									</Chip>
								))}
							</ChipGroup>
						</div>

						<div className={styles.group}>
							<span className={styles.groupLabel} aria-hidden="true">
								期限の種類
							</span>

							<ChipGroup label="期限の種類">
								{kindOptions.map((option) => (
									<Chip
										key={option.value}
										pressed={value.expiryKind === option.value}
										disabled={disabled}
										onClick={() =>
											onChange({
												...value,
												expiryKind:
													value.expiryKind === option.value ? "" : option.value,
											})
										}
									>
										{option.label}
									</Chip>
								))}
							</ChipGroup>
						</div>

						{extraDetails}
					</div>
				) : null}
			</div>
		</div>
	);
}

// たたんだ行に出す、保存方法と期限の種類（と、ほかの欄）の要約（例：「冷蔵・賞味期限」。どれもなければ「未設定」）。
function summarizeDetails(
	value: ExpiryFieldsValue,
	extraSummary: string | undefined,
): string {
	const parts = [
		value.storage === "" ? null : storageLabels[value.storage],
		value.expiryKind === "" ? null : expiryKindLabels[value.expiryKind],
		extraSummary ?? null,
	].filter((part) => part !== null);

	return parts.length === 0 ? "未設定" : parts.join("・");
}

// 入力欄の値を、サーバーに送るロットの条件にする（空の項目は、省略する）。
export function toLotInput(value: ExpiryFieldsValue): {
	expiresOn?: string;
	expiryKind?: InventoryExpiryKind;
	expirySource?: InventoryExpirySource;
	storage?: InventoryStorage;
} {
	return {
		...(value.expiresOn !== ""
			? {
					expiresOn: value.expiresOn,
					expirySource:
						value.expirySource === "" ? "entered" : value.expirySource,
				}
			: {}),
		// 日付がないときの期限の種類は、「なし」だけが意味を持つ（種類だけを送っても、保存されない）。
		...(value.expiryKind !== "" &&
		(value.expiresOn !== "" || value.expiryKind === "none")
			? { expiryKind: value.expiryKind }
			: {}),
		...(value.storage !== "" ? { storage: value.storage } : {}),
	};
}
