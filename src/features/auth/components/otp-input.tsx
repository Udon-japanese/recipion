import {
	type ChangeEvent,
	type CompositionEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import * as styles from "./otp-input.css";
import {
	digitsFromRaw,
	extractDigits,
	isComplete,
	joinDigits,
} from "./otp-input-logic";

// 変換の確定の通知（compositionend）を待つ、最長の時間。
const COMPOSITION_COMMIT_TIMEOUT_MS = 150;

type OtpInputProps = {
	// 桁ごとの値（空の桁は ""）。長さが、桁数になる。
	digits: readonly string[];
	onChange: (digits: string[]) => void;
	// 全桁が埋まったとき（入力、貼り付け、自動入力のどれでも。変換中でも、知らせる）。
	onComplete?: (code: string) => void;
	label: string;
	disabled?: boolean;
	invalid?: boolean;
	autoFocus?: boolean;
	// 値を変えると、入力欄にフォーカスする（コードを間違えたあとの、入力のやり直しなど）。
	focusRequestKey?: number;
};

// ワンタイムコードの入力欄。
// 本物の入力欄は 1 つで、透明にして、見た目の桁ごとの枠の上に重ねる（欄を移さない）。
// - 日本語入力がオンのままでも、全角の数字を、半角の数字として扱う。変換中は、入力欄の中身を書き換えない。
//   桁がそろったら、変換を確定させてから、完成を知らせる（確定前に検証して失敗すると、確定前の文字が残る）
//   （書き換えると、IME と衝突して、桁が崩れる。実機の実験で確認：Mac の Chrome・Safari、Windows の Edge）。
//   中身から数字だけを取り出して、枠に表示する。変換が確定したら、中身を数字だけに直す。
// - 貼り付けや、ブラウザ・OS の自動入力（SMS やメールのコードの候補）は、1 つの欄に入るだけなので、そのまま動く。
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
	const inputRef = useRef<HTMLInputElement>(null);
	// IME の変換中か。
	const composingRef = useRef(false);
	// 直前に、完成を知らせたコード（同じコードで、続けて知らせない）。
	const lastCompletedRef = useRef("");
	const [isFocused, setIsFocused] = useState(false);
	const length = digits.length;
	const joined = joinDigits(digits);

	// 親が値を変えたとき（コードを間違えたあとのリセットなど）、入力欄の中身を合わせる。
	// 変換中でも、合わせる（残したままだと、次に打つ数字が、古い中身に足されてしまう）。
	useEffect(() => {
		const input = inputRef.current;

		if (!input) {
			return;
		}

		if (extractDigits(input.value).slice(0, length) !== joined) {
			input.value = joined;
			composingRef.current = false;
		}

		if (joined.length < length) {
			lastCompletedRef.current = "";
		}
	}, [joined, length]);

	useEffect(() => {
		if (autoFocus) inputRef.current?.focus();
	}, [autoFocus]);

	// focusRequestKey が変わったときだけ、フォーカスする。
	useEffect(() => {
		if (focusRequestKey === 0) return;

		inputRef.current?.focus();
	}, [focusRequestKey]);

	// notify が false のときは、完成しても知らせない（変換の確定を待つため）。
	function update(raw: string, notify = true) {
		const next = digitsFromRaw(raw, length);
		const nextJoined = joinDigits(next);

		if (nextJoined !== joined) {
			onChange(next);
		}

		if (isComplete(next)) {
			if (notify && lastCompletedRef.current !== nextJoined) {
				lastCompletedRef.current = nextJoined;
				onComplete?.(nextJoined);
			}
		} else {
			lastCompletedRef.current = "";
		}

		return nextJoined;
	}

	// 変換の確定を待たずに、完成を知らせてはいけない。
	// 知らせると、検証の失敗で親が中身を空にしても、確定前の文字がブラウザに残り、
	// あとで確定したときに、もう一度入ってきてしまう（消せない）。
	// そこで、変換中に完成したら、入力欄の focus を外して変換を確定させ（compositionend が届く）、そこで知らせる。
	// compositionend が届かない環境のために、少し待って、強制的に確定させる。
	function commitCompositionThenComplete(input: HTMLInputElement) {
		input.blur();

		window.setTimeout(() => {
			if (!composingRef.current) {
				return;
			}

			composingRef.current = false;
			input.value = update(input.value);
		}, COMPOSITION_COMMIT_TIMEOUT_MS);
	}

	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		const input = event.target;
		const isComposing =
			composingRef.current ||
			(event.nativeEvent as InputEvent).isComposing === true;
		const nextJoined = update(input.value, !isComposing);

		if (isComposing) {
			// 変換中に、桁がそろったら、変換を確定させてから、完成を知らせる。
			if (nextJoined.length === length) {
				commitCompositionThenComplete(input);
			}

			return;
		}

		// 変換中でなければ、中身を数字だけに直す。
		if (input.value !== nextJoined) {
			input.value = nextJoined;
		}
	}

	function handleCompositionEnd(event: CompositionEvent<HTMLInputElement>) {
		composingRef.current = false;
		// 変換が確定したので、中身を数字だけに直す。
		event.currentTarget.value = update(event.currentTarget.value);
	}

	const activeIndex = Math.min(joined.length, length - 1);

	return (
		<fieldset className={styles.fieldset}>
			<div className={styles.root}>
				<div className={styles.group} aria-hidden="true">
					{digits.map((digit, index) => (
						<div
							// 桁は、位置が識別子。
							// biome-ignore lint/suspicious/noArrayIndexKey: 位置が、そのまま桁の識別子になる。
							key={index}
							data-otp-box=""
							className={[
								styles.box,
								isFocused && !disabled && index === activeIndex
									? styles.boxActive
									: "",
								invalid ? styles.boxInvalid : "",
								disabled ? styles.boxDisabled : "",
							]
								.filter(Boolean)
								.join(" ")}
						>
							{digit}
						</div>
					))}
				</div>
				<input
					ref={inputRef}
					className={styles.input}
					type="text"
					inputMode="numeric"
					autoComplete="one-time-code"
					aria-label={label}
					aria-invalid={invalid || undefined}
					disabled={disabled}
					onChange={handleChange}
					onCompositionStart={() => {
						composingRef.current = true;
					}}
					onCompositionEnd={handleCompositionEnd}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
				/>
			</div>
		</fieldset>
	);
}
