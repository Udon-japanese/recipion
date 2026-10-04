import { expiryKindLabels, storageLabels } from "../domain/expiry-labels";
import {
	addDays,
	type InventoryExpiryKind,
	type InventoryStorage,
} from "../domain/inventory-lot";
import * as styles from "./expiry-fields.css";

export type ExpiryFieldsValue = {
	// 期限の日付（YYYY-MM-DD）。空文字は、入力なし。
	expiresOn: string;
	expiryKind: InventoryExpiryKind | "";
	storage: InventoryStorage | "";
};

export const emptyExpiryFields: ExpiryFieldsValue = {
	expiresOn: "",
	expiryKind: "",
	storage: "",
};

type ExpiryFieldsProps = {
	// 項目の ID の接頭辞（同じ画面に複数あるときに、重ならないようにする）。
	idPrefix: string;
	value: ExpiryFieldsValue;
	onChange: (value: ExpiryFieldsValue) => void;
	// 「今日」を基準にするクイック入力のための、今日の日付（YYYY-MM-DD）。
	today: string;
	disabled?: boolean;
};

const quickOptions = [
	{ label: "今日", days: 0 },
	{ label: "明日", days: 1 },
	{ label: "+3日", days: 3 },
	{ label: "+1週間", days: 7 },
] as const;

// 期限（日付・消費/賞味）と、保存方法の入力欄。すべて任意。
export function ExpiryFields({
	idPrefix,
	value,
	onChange,
	today,
	disabled,
}: ExpiryFieldsProps) {
	return (
		<div className={styles.container}>
			<div className={styles.row}>
				<div className={styles.field}>
					<label className={styles.label} htmlFor={`${idPrefix}-expires-on`}>
						期限
					</label>
					<input
						className={styles.input}
						id={`${idPrefix}-expires-on`}
						type="date"
						value={value.expiresOn}
						disabled={disabled}
						onChange={(event) =>
							onChange({ ...value, expiresOn: event.target.value })
						}
					/>
				</div>

				<div className={styles.field}>
					<label className={styles.label} htmlFor={`${idPrefix}-expiry-kind`}>
						期限の種類
					</label>
					<select
						className={styles.input}
						id={`${idPrefix}-expiry-kind`}
						value={value.expiryKind}
						disabled={disabled}
						onChange={(event) =>
							onChange({
								...value,
								expiryKind: event.target
									.value as ExpiryFieldsValue["expiryKind"],
							})
						}
					>
						<option value="">指定しない</option>
						<option value="use-by">{expiryKindLabels["use-by"]}</option>
						<option value="best-before">
							{expiryKindLabels["best-before"]}
						</option>
						<option value="none">{expiryKindLabels.none}</option>
					</select>
				</div>

				<div className={styles.field}>
					<label className={styles.label} htmlFor={`${idPrefix}-storage`}>
						保存方法
					</label>
					<select
						className={styles.input}
						id={`${idPrefix}-storage`}
						value={value.storage}
						disabled={disabled}
						onChange={(event) =>
							onChange({
								...value,
								storage: event.target.value as ExpiryFieldsValue["storage"],
							})
						}
					>
						<option value="">指定しない</option>
						<option value="room">{storageLabels.room}</option>
						<option value="fridge">{storageLabels.fridge}</option>
						<option value="freezer">{storageLabels.freezer}</option>
					</select>
				</div>
			</div>

			<div className={styles.quickButtons}>
				{quickOptions.map((option) => (
					<button
						className={styles.quickButton}
						type="button"
						key={option.label}
						disabled={disabled}
						aria-label={`期限を${option.label}にする`}
						onClick={() =>
							onChange({ ...value, expiresOn: addDays(today, option.days) })
						}
					>
						{option.label}
					</button>
				))}

				{value.expiresOn !== "" ? (
					<button
						className={styles.quickButton}
						type="button"
						disabled={disabled}
						onClick={() => onChange({ ...value, expiresOn: "" })}
					>
						期限を消す
					</button>
				) : null}
			</div>
		</div>
	);
}

// 入力欄の値を、サーバーに送るロットの条件にする（空の項目は、省略する）。
export function toLotInput(value: ExpiryFieldsValue): {
	expiresOn?: string;
	expiryKind?: InventoryExpiryKind;
	storage?: InventoryStorage;
} {
	return {
		...(value.expiresOn !== "" ? { expiresOn: value.expiresOn } : {}),
		...(value.expiryKind !== "" ? { expiryKind: value.expiryKind } : {}),
		...(value.storage !== "" ? { storage: value.storage } : {}),
	};
}
