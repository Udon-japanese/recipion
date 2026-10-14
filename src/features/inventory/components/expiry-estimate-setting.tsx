import { useState } from "react";
import { Icon } from "#/components/icon/icon";
import { Sheet } from "#/components/sheet/sheet";
import { useMediaQuery } from "#/components/use-media-query";
import type { ExpiryEstimateLevel } from "../domain/estimate-lot-expiry";
import * as styles from "./expiry-estimate-setting.css";

type ExpiryEstimateSettingProps = {
	level: ExpiryEstimateLevel;
	onChange: (level: ExpiryEstimateLevel) => void;
};

const options: readonly {
	value: ExpiryEstimateLevel;
	label: string;
	detail?: string;
}[] = [
	{ value: "off", label: "オフ（自動で入れない）" },
	{ value: "reliable", label: "確実なものだけ" },
	{ value: "all", label: "すべて", detail: "肉・魚などの短めの目安も" },
];

// 期限の目安の自動入力の設定（3 つから選ぶ）。オフにしても、期限は、手で入れられる。
export function ExpiryEstimateSetting({
	level,
	onChange,
}: ExpiryEstimateSettingProps) {
	return (
		<div className={styles.container}>
			<fieldset className={styles.options}>
				<legend className={styles.legend}>期限の目安の自動入力</legend>

				{options.map((option) => (
					<label className={styles.option} key={option.value}>
						<input
							className={styles.radio}
							type="radio"
							name="expiry-estimate-level"
							value={option.value}
							checked={level === option.value}
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
			</fieldset>

			<p className={styles.note}>
				目安は、必ず「約」と表示します。パックや袋の日付がある場合は、その日付を優先してください。この設定は、この端末に保存されます。
			</p>
		</div>
	);
}

// 別のシートの中に置く、設定への入口（いまの設定を右に見せて、押すと小さなシートが開く）。
export function ExpiryEstimateSettingRow({
	level,
	onChange,
}: ExpiryEstimateSettingProps) {
	const [isOpen, setIsOpen] = useState(false);
	const isRight = useMediaQuery("(min-width: 1024px)");
	const current = options.find((option) => option.value === level);

	return (
		<>
			<button
				className={styles.row}
				type="button"
				aria-haspopup="dialog"
				onClick={() => setIsOpen(true)}
			>
				<Icon name="sliders" size={20} />
				<span className={styles.rowLabel}>期限の目安の自動入力</span>
				<span className={styles.rowValue}>
					{current?.value === "off" ? "オフ" : current?.label}
				</span>
				<Icon name="chevron-right" size={20} />
			</button>

			<Sheet
				open={isOpen}
				onOpenChange={setIsOpen}
				title="期限の目安の自動入力"
				placement={isRight ? "right" : "bottom"}
				snapPoints={[0.62]}
			>
				<ExpiryEstimateSetting level={level} onChange={onChange} />
			</Sheet>
		</>
	);
}
