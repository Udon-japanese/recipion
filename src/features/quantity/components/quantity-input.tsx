import type { ReactNode } from "react";
import { Chip } from "#/components/chip/chip";
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
	// 入力欄の右に並べるもの（単位の選択など）。ボタンは、その下に、横幅いっぱいで並ぶ。
	trailing?: ReactNode;
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
	trailing,
}: QuantityInputProps) {
	const buttons = getQuantityButtons(unitLabel);
	const parsed = parseQuantityInput(value);
	// 小数・整数のままのときは、確認の表示は要らない。
	const isPlainNumber = /^\s*[\d.]+\s*$/u.test(value);

	const input = (
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
	);

	return (
		<div className={styles.container}>
			{trailing ? (
				<div className={styles.inputLine}>
					<div className={styles.inputMain}>{input}</div>
					{trailing}
				</div>
			) : (
				input
			)}

			{parsed !== null && !isPlainNumber ? (
				<span className={styles.hint}>= {parsed}</span>
			) : null}

			{buttons.length > 0 ? (
				<div className={styles.fractionButtons}>
					{buttons.map((button) => (
						<Chip
							key={describeQuantityButton(button)}
							size="qty"
							disabled={disabled}
							aria-label={describeQuantityButtonForAssistiveTech(button)}
							onClick={() => onChange(applyQuantityButton(value, button))}
						>
							{describeQuantityButton(button)}
						</Chip>
					))}
				</div>
			) : null}
		</div>
	);
}
