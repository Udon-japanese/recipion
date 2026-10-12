import { parseQuantityInput } from "../domain/parse-quantity-input";
import {
	applyQuantityButton,
	describeQuantityButton,
	describeQuantityButtonForAssistiveTech,
	getQuantityButtons,
} from "../domain/quantity-buttons";
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
	// 単位（個・本・玉・株・g・mlなど）。単位に合わせたボタンを出す（本は 1/3・1/2・2/3、g は +50・+100 など）。
	// 省略か、ボタンのない単位（枚・袋など）は、ボタンなし。
	unitLabel?: string | null;
};

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
	unitLabel,
}: QuantityInputProps) {
	const buttons = getQuantityButtons(unitLabel);
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

			{buttons.length > 0 ? (
				<div className={styles.fractionButtons}>
					{buttons.map((button) => (
						<button
							className={styles.fractionButton}
							type="button"
							key={describeQuantityButton(button)}
							disabled={disabled}
							aria-label={describeQuantityButtonForAssistiveTech(button)}
							onClick={() => onChange(applyQuantityButton(value, button))}
						>
							{describeQuantityButton(button)}
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
