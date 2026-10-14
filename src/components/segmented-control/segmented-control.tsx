import { Icon } from "../icon/icon";
import type { IconName } from "../icon/icon-definitions";
import * as styles from "./segmented-control.css";

type SegmentedOption<Value extends string> = {
	value: Value;
	label: string;
	icon?: IconName;
};

type SegmentedControlProps<Value extends string> = {
	// グループの名前（読み上げ）。
	label: string;
	options: readonly SegmentedOption<Value>[];
	value: Value;
	onChange: (value: Value) => void;
};

// 2〜3つの選択（表示の切り替え・管理方法など）。選ばれているものは、白い地＋濃い枠。
export function SegmentedControl<Value extends string>({
	label,
	options,
	value,
	onChange,
}: SegmentedControlProps<Value>) {
	return (
		<fieldset className={styles.root} aria-label={label}>
			{options.map((option) => (
				<button
					className={styles.option}
					type="button"
					key={option.value}
					aria-pressed={option.value === value}
					onClick={() => onChange(option.value)}
				>
					{option.icon ? <Icon name={option.icon} size={20} /> : null}
					{option.label}
				</button>
			))}
		</fieldset>
	);
}
