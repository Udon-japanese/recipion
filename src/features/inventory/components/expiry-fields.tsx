import { Chip, ChipGroup } from "#/components/chip/chip";
import { Field, TextInput } from "#/components/field/field";
import { Icon } from "#/components/icon/icon";
import type { IconName } from "#/components/icon/icon-definitions";
import { SegmentedControl } from "#/components/segmented-control/segmented-control";
import {
	type ExpiryFieldsValue,
	emptyExpiryFields,
} from "../domain/build-expiry-prefill";
import {
	expiryKindLabels,
	formatDateWithWeekday,
	storageLabels,
} from "../domain/expiry-labels";
import {
	addDays,
	type InventoryExpiryKind,
	type InventoryExpirySource,
	type InventoryStorage,
} from "../domain/inventory-lot";
import * as styles from "./expiry-fields.css";

export { type ExpiryFieldsValue, emptyExpiryFields };

type ExpiryFieldsProps = {
	value: ExpiryFieldsValue;
	onChange: (value: ExpiryFieldsValue) => void;
	// 「今日」を基準にするクイック入力のための、今日の日付（YYYY-MM-DD）。
	today: string;
	disabled?: boolean;
};

const storageOptions: readonly {
	value: ExpiryFieldsValue["storage"];
	label: string;
	icon?: IconName;
}[] = [
	{ value: "", label: "指定しない" },
	{ value: "room", label: storageLabels.room, icon: "zone-table" },
	{ value: "fridge", label: storageLabels.fridge, icon: "zone-fridge" },
	{ value: "freezer", label: storageLabels.freezer, icon: "zone-freezer" },
];

const kindOptions: readonly {
	value: ExpiryFieldsValue["expiryKind"];
	label: string;
}[] = [
	{ value: "", label: "指定しない" },
	{ value: "use-by", label: expiryKindLabels["use-by"] },
	{ value: "best-before", label: expiryKindLabels["best-before"] },
	{ value: "none", label: expiryKindLabels.none },
];

const quickOptions = [
	{ label: "今日", days: 0 },
	{ label: "明日", days: 1 },
	{ label: "+3日", days: 3 },
	{ label: "+1週間", days: 7 },
] as const;

// 期限（日付・消費/賞味）と、保存方法の入力欄。すべて任意。
// 日付をユーザーが入れる（クイック入力を含む）と、出所は「入力」になる。自動の目安は、「約」と示す。
export function ExpiryFields({
	value,
	onChange,
	today,
	disabled,
}: ExpiryFieldsProps) {
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
							onClick={() => onChange({ ...value, storage: option.value })}
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

				<SegmentedControl
					label="期限の種類"
					value={value.expiryKind}
					onChange={(expiryKind) => onChange({ ...value, expiryKind })}
					options={kindOptions}
				/>
			</div>

			<Field label="期限" hint={`今日 ${formatDateWithWeekday(today)}`}>
				{(control) => (
					<TextInput
						{...control}
						type="date"
						value={value.expiresOn}
						disabled={disabled}
						onChange={(event) => setDate(event.target.value)}
					/>
				)}
			</Field>

			<ChipGroup label="期限のクイック入力">
				{quickOptions.map((option) => (
					<Chip
						key={option.label}
						disabled={disabled}
						aria-label={`期限を${option.label}にする`}
						onClick={() => setDate(addDays(today, option.days))}
					>
						{option.label}
					</Chip>
				))}

				{value.expiresOn !== "" ? (
					<Chip icon="close" disabled={disabled} onClick={() => setDate("")}>
						期限を消す
					</Chip>
				) : null}
			</ChipGroup>

			{value.expirySource === "estimated" && value.expiresOn !== "" ? (
				<p className={styles.estimateNote}>
					<Icon name="info-circle" size={16} />
					目安の日付（約）です。パックや袋の表示がある場合は、その日付を入れてください。
				</p>
			) : null}
		</div>
	);
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
