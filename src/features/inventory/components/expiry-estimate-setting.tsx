import { RadioList } from "#/components/radio-list/radio-list";
import type { ExpiryEstimateLevel } from "../domain/estimate-lot-expiry";

export type ExpiryEstimateSettingProps = {
	level: ExpiryEstimateLevel;
	onChange: (level: ExpiryEstimateLevel) => void;
};

const options: readonly {
	value: ExpiryEstimateLevel;
	label: string;
	detail?: string;
}[] = [
	{ value: "off", label: "入れない" },
	{
		value: "reliable",
		label: "確実なものだけ",
		detail: "野菜・冷凍・日持ちする保存食など",
	},
	{
		value: "all",
		label: "すべて",
		detail: "肉・魚など、傷みやすいものにも短めの目安を入れる",
	},
];

// 期限の目安の自動入力の設定（在庫に追加するとき・購入を確定するとき）。オフにしても、期限は、手で入れられる。
export function ExpiryEstimateSetting({
	level,
	onChange,
}: ExpiryEstimateSettingProps) {
	return (
		<RadioList
			legend="期限の目安の自動入力"
			name="expiry-estimate-level"
			options={options}
			value={level}
			onChange={onChange}
		/>
	);
}
