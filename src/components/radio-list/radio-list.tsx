import * as styles from "./radio-list.css";

type RadioOption<Value extends string> = {
	value: Value;
	label: string;
	// 名前の下の補足。
	detail?: string;
	// 選べない（押せず、薄く出す）。
	disabled?: boolean;
};

type RadioListProps<Value extends string> = {
	// グループの名前（見出し）。
	legend: string;
	// 見出しを画面に出さず、読み上げだけにする（まわりから明らかなとき）。
	hideLegend?: boolean;
	// 同じ画面に複数あるときに、重ならないようにする名前。
	name: string;
	options: readonly RadioOption<Value>[];
	value: Value;
	onChange: (value: Value) => void;
};

// 行を並べた選択（3つ前後から 1 つ選ぶ。行のどこを押しても選べる）。選ばれた行は、黄色の地。
export function RadioList<Value extends string>({
	legend,
	hideLegend,
	name,
	options,
	value,
	onChange,
}: RadioListProps<Value>) {
	return (
		<fieldset className={styles.root}>
			<legend className={hideLegend ? styles.hiddenLegend : styles.legend}>
				{legend}
			</legend>

			<div className={styles.options}>
				{options.map((option) => (
					<label className={styles.option} key={option.value}>
						<input
							className={styles.radio}
							type="radio"
							name={name}
							value={option.value}
							checked={value === option.value}
							disabled={option.disabled}
							onChange={() => onChange(option.value)}
						/>
						<span className={styles.mark} aria-hidden="true" />
						<span className={styles.optionText}>
							{option.label}
							{option.detail ? (
								<span className={styles.detail}>{option.detail}</span>
							) : null}
						</span>
					</label>
				))}
			</div>
		</fieldset>
	);
}
