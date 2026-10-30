import { useState } from "react";
import { Icon } from "#/components/icon/icon";
import { RadioList } from "#/components/radio-list/radio-list";
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
			<RadioList
				legend="期限の目安の自動入力"
				hideLegend
				name="expiry-estimate-level"
				options={options}
				value={level}
				onChange={onChange}
			/>

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
	quiet = false,
}: ExpiryEstimateSettingProps & {
	// 画面のじゃまにならない、文字だけの入口にする。
	quiet?: boolean;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const isRight = useMediaQuery("(min-width: 1024px)");
	const current = options.find((option) => option.value === level);

	return (
		<>
			<button
				className={quiet ? styles.quietRow : styles.row}
				type="button"
				aria-haspopup="dialog"
				onClick={() => setIsOpen(true)}
			>
				<Icon name="sliders" size={quiet ? 16 : 20} />
				<span className={quiet ? undefined : styles.rowLabel}>
					期限の目安の自動入力
				</span>
				<span className={quiet ? undefined : styles.rowValue}>
					{current?.value === "off" ? "オフ" : current?.label}
				</span>
				{quiet ? null : <Icon name="chevron-right" size={20} />}
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
