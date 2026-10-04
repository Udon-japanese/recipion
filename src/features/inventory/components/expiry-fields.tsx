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

export { emptyExpiryFields, type ExpiryFieldsValue };

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
// 日付をユーザーが入れる（クイック入力を含む）と、出所は「入力」になる。自動の目安は、「約」と示す。
export function ExpiryFields({
	idPrefix,
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
			<div className={styles.row}>
				<div className={styles.field}>
					{/* 期限を入れるときに、今日が何日か、見えるようにする（小さく表示）。 */}
					<div className={styles.labelRow}>
						<label className={styles.label} htmlFor={`${idPrefix}-expires-on`}>
							期限
						</label>
						<span className={styles.todayNote}>
							今日 {formatDateWithWeekday(today)}
						</span>
					</div>
					<input
						className={styles.input}
						id={`${idPrefix}-expires-on`}
						type="date"
						value={value.expiresOn}
						disabled={disabled}
						onChange={(event) => setDate(event.target.value)}
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

			{value.expirySource === "estimated" && value.expiresOn !== "" ? (
				<p className={styles.estimateNote}>
					目安の日付（約）です。パックや袋の表示がある場合は、その日付を入れてください。
				</p>
			) : null}

			<div className={styles.quickButtons}>
				{quickOptions.map((option) => (
					<button
						className={styles.quickButton}
						type="button"
						key={option.label}
						disabled={disabled}
						aria-label={`期限を${option.label}にする`}
						onClick={() => setDate(addDays(today, option.days))}
					>
						{option.label}
					</button>
				))}

				{value.expiresOn !== "" ? (
					<button
						className={styles.quickButton}
						type="button"
						disabled={disabled}
						onClick={() => setDate("")}
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
