import { PickerSelect } from "../../../components/select/picker-select";
import type { ExpiryEstimateLevel } from "../domain/estimate-lot-expiry";
import * as styles from "./expiry-fields.css";

type ExpiryEstimateSettingProps = {
	level: ExpiryEstimateLevel;
	onChange: (level: ExpiryEstimateLevel) => void;
};

// 期限の目安の自動入力の設定。オフにしても、期限は、手で入れられる（期限なしでも、アプリは使える）。
export function ExpiryEstimateSetting({
	level,
	onChange,
}: ExpiryEstimateSettingProps) {
	return (
		<div className={styles.field}>
			<label className={styles.label} htmlFor="expiry-estimate-level">
				期限の目安の自動入力
			</label>
			<PickerSelect
				className={styles.input}
				id="expiry-estimate-level"
				value={level}
				onChange={(event) =>
					onChange(event.target.value as ExpiryEstimateLevel)
				}
			>
				<option value="off">オフ（自動で入れない）</option>
				<option value="reliable">確実なものだけ</option>
				<option value="all">すべて（肉・魚などの短めの目安も）</option>
			</PickerSelect>
			<p className={styles.estimateNote}>
				目安は、必ず「約」と表示します。パックや袋の日付がある場合は、その日付を優先してください。この設定は、この端末に保存されます。
			</p>
		</div>
	);
}
