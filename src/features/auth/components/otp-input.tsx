import {
	type ClipboardEvent,
	type KeyboardEvent,
	useEffect,
	useRef,
} from "react";
import * as styles from "./otp-input.css";
import {
	applyBackspace,
	applyDelete,
	applyInput,
	type DigitsUpdate,
	isComplete,
	joinDigits,
	stripExistingDigit,
} from "./otp-input-logic";

type OtpInputProps = {
	// 1 桁ずつの、欄の中身（空の欄は ""）。長さが、桁数になる。
	digits: readonly string[];
	onChange: (digits: string[]) => void;
	// 全桁が埋まったとき（入力、貼り付け、自動入力のどれでも）。
	onComplete?: (code: string) => void;
	label: string;
	disabled?: boolean;
	invalid?: boolean;
	autoFocus?: boolean;
	// 値を変えると、最初の空の欄にフォーカスする（コードを間違えたあとの、入力のやり直しなど）。
	focusRequestKey?: number;
};

// 1 桁ずつ別の欄に入れる、ワンタイムコードの入力欄。
// - 入力すると、次の欄に移る。Backspace で、前の欄に戻る。矢印キーでも移動できる。
// - 貼り付けや、ブラウザ・OS の自動入力（SMS やメールのコードの候補）は、どの欄に入っても、全桁に振り分ける。
//   自動入力のために、すべての欄に autocomplete="one-time-code" を付け、欄の maxLength は桁数にしている。
export function OtpInput({
	digits,
	onChange,
	onComplete,
	label,
	disabled = false,
	invalid = false,
	autoFocus = false,
	focusRequestKey = 0,
}: OtpInputProps) {
	const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
	const length = digits.length;

	function focusInput(index: number) {
		inputRefs.current[index]?.focus();
	}

	function commit(update: DigitsUpdate) {
		onChange(update.digits);
		focusInput(update.focusIndex);

		if (isComplete(update.digits)) {
			onComplete?.(joinDigits(update.digits));
		}
	}

	useEffect(() => {
		if (autoFocus) inputRefs.current[0]?.focus();
	}, [autoFocus]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: focusRequestKey が変わったときだけ、フォーカスする。
	useEffect(() => {
		if (focusRequestKey === 0) return;

		const firstEmpty = digits.indexOf("");

		focusInput(firstEmpty === -1 ? length - 1 : firstEmpty);
	}, [focusRequestKey]);

	function handleKeyDown(
		event: KeyboardEvent<HTMLInputElement>,
		index: number,
	) {
		switch (event.key) {
			case "Backspace":
				event.preventDefault();
				commit(applyBackspace(digits, index));
				break;
			case "Delete":
				event.preventDefault();
				commit(applyDelete(digits, index));
				break;
			case "ArrowLeft":
				event.preventDefault();
				focusInput(Math.max(index - 1, 0));
				break;
			case "ArrowRight":
				event.preventDefault();
				focusInput(Math.min(index + 1, length - 1));
				break;
		}
	}

	function handlePaste(event: ClipboardEvent<HTMLInputElement>, index: number) {
		event.preventDefault();
		commit(applyInput(digits, index, event.clipboardData.getData("text")));
	}

	return (
		<fieldset className={styles.fieldset} aria-label={label}>
			<div className={styles.group}>
				{digits.map((digit, index) => (
					<input
						// 欄は、位置が識別子（桁の入れ替えは起きない）。
						// biome-ignore lint/suspicious/noArrayIndexKey: 位置が、そのまま桁の識別子になる。
						key={index}
						ref={(element) => {
							inputRefs.current[index] = element;
						}}
						className={`${styles.box} ${invalid ? styles.boxInvalid : ""}`}
						type="text"
						inputMode="numeric"
						pattern="[0-9]*"
						autoComplete="one-time-code"
						maxLength={length}
						aria-label={`${index + 1}桁目`}
						aria-invalid={invalid || undefined}
						value={digit}
						disabled={disabled}
						onFocus={(event) => event.target.select()}
						onChange={(event) => {
							const raw = stripExistingDigit(digit, event.target.value);

							if (event.target.value === "") {
								// 選択して削除したときなど、値が空になった入力。
								commit(applyDelete(digits, index));

								return;
							}

							commit(applyInput(digits, index, raw));
						}}
						onKeyDown={(event) => handleKeyDown(event, index)}
						onPaste={(event) => handlePaste(event, index)}
					/>
				))}
			</div>
		</fieldset>
	);
}
