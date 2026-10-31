import { Field, SelectBox } from "#/components/field/field";
import type { ExpiryEstimateLevel } from "../domain/estimate-lot-expiry";
import * as styles from "./expiry-estimate-setting.css";

export type ExpiryEstimateSettingProps = {
	level: ExpiryEstimateLevel;
	onChange: (level: ExpiryEstimateLevel) => void;
};

const options: readonly { value: ExpiryEstimateLevel; label: string }[] = [
	{ value: "off", label: "オフ（自動で入れない）" },
	{ value: "reliable", label: "確実なものだけ" },
	{ value: "all", label: "すべて（肉・魚などの短めの目安も）" },
];

// 期限の目安の自動入力の設定（3 つから選ぶ）。オフにしても、期限は、手で入れられる。
export function ExpiryEstimateSetting({
	level,
	onChange,
}: ExpiryEstimateSettingProps) {
	return (
		<div className={styles.container}>
			<Field
				label="期限の目安の自動入力"
				hint="目安は、必ず「約」と表示します。パックや袋の日付がある場合は、その日付を優先してください。この設定は、この端末に保存されます。"
			>
				{(control) => (
					<SelectBox
						{...control}
						name="expiry-estimate-level"
						value={level}
						onChange={(event) => {
							const next = options.find(
								(option) => option.value === event.target.value,
							);

							if (next) {
								onChange(next.value);
							}
						}}
					>
						{options.map((option) => (
							<option value={option.value} key={option.value}>
								{option.label}
							</option>
						))}
					</SelectBox>
				)}
			</Field>
		</div>
	);
}
