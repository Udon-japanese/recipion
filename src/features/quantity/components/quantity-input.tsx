import { parseQuantityInput } from "../domain/parse-quantity-input";
import * as styles from "./quantity-input.css";

type QuantityInputProps = {
	id?: string;
	name?: string;
	value: string;
	onChange: (value: string) => void;
	className?: string;
	placeholder?: string;
	disabled?: boolean;
	"aria-label"?: string;
	// 「1/4」「1/2」「3/4」のボタンを出す（野菜の1/2カットなど）。
	showFractionButtons?: boolean;
};

const fractionOptions = ["1/4", "1/2", "3/4"] as const;

// 数量の入力欄。「1/2」「1と1/2」「0.5」のように、分数でも小数でも入力できる。
// 分数のときは、「= 0.5」と、数値にした結果を、横に出す。
export function QuantityInput({
	id,
	name,
	value,
	onChange,
	className,
	placeholder,
	disabled,
	"aria-label": ariaLabel,
	showFractionButtons = true,
}: QuantityInputProps) {
	const parsed = parseQuantityInput(value);
	// 小数・整数のままのときは、確認の表示は要らない。
	const isPlainNumber = /^\s*[\d.]+\s*$/u.test(value);

	return (
		<div className={styles.container}>
			<input
				className={className}
				id={id}
				name={name}
				value={value}
				placeholder={placeholder}
				disabled={disabled}
				aria-label={ariaLabel}
				inputMode="decimal"
				autoComplete="off"
				onChange={(event) => onChange(event.target.value)}
			/>

			{parsed !== null && !isPlainNumber ? (
				<span className={styles.hint}>= {parsed}</span>
			) : null}

			{showFractionButtons ? (
				<div className={styles.fractionButtons}>
					{fractionOptions.map((fraction) => (
						<button
							className={styles.fractionButton}
							type="button"
							key={fraction}
							disabled={disabled}
							aria-label={`${fraction}にする`}
							onClick={() => onChange(fraction)}
						>
							{fraction}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
