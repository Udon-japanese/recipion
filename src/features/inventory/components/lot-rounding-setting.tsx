import { RadioList } from "#/components/radio-list/radio-list";
import type { LotRounding } from "../domain/lot-unit-decrease";

export type LotRoundingSettingProps = {
	rounding: LotRounding;
	onChange: (rounding: LotRounding) => void;
};

const options: readonly {
	value: LotRounding;
	label: string;
	detail?: string;
}[] = [
	{
		value: "up",
		label: "切り上げる",
		detail: "うどん200gを、1個＝110gの在庫から、2個引く",
	},
	{
		value: "exact",
		label: "ぴったり引く",
		detail: "うどん200gを、1個＝110gの在庫から、1.8個引く",
	},
];

// 「つくった」で在庫から引くとき、ロットの換算（1個＝110g など）で量った端数を、どう引くか。
export function LotRoundingSetting({
	rounding,
	onChange,
}: LotRoundingSettingProps) {
	return (
		<RadioList
			legend="買った単位の換算で引くときの端数"
			name="lot-rounding"
			options={options}
			value={rounding}
			onChange={onChange}
		/>
	);
}
