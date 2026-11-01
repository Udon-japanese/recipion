import { RadioList } from "#/components/radio-list/radio-list";
import type { StandInMode } from "../domain/find-stand-ins";

export type StandInModeSettingProps = {
	mode: StandInMode;
	onChange: (mode: StandInMode) => void;
};

const options: readonly {
	value: StandInMode;
	label: string;
	detail?: string;
}[] = [
	{
		value: "auto",
		label: "自動で使う",
		detail: "みじん切りなど、切り方が決まっているものは、毎回選ぶ",
	},
	{ value: "ask", label: "毎回選ぶ" },
	{ value: "off", label: "使わない" },
];

// 買い物メモに入れるときと、「作った」で在庫から引くときに、生の野菜の在庫が足りなければ、冷凍野菜で足りるかを見るか。
// 冷凍野菜だけで必要な量を満たすときだけ、代わりにする（知らせる）。
export function StandInModeSetting({
	mode,
	onChange,
}: StandInModeSettingProps) {
	return (
		<RadioList
			legend="冷凍野菜を、生の野菜の代わりに使う"
			name="stand-in-mode"
			options={options}
			value={mode}
			onChange={onChange}
		/>
	);
}
