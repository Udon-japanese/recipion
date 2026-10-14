import {
	type ChangeEvent,
	type CompositionEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { chooseCompositionStrategy } from "#/features/recipes/domain/choose-composition-strategy";
import { readBrowserEnvironment } from "#/features/recipes/infrastructure/read-browser-environment";
import * as styles from "./otp-input.css";
import {
	digitsFromRaw,
	extractDigits,
	isComplete,
	joinDigits,
} from "./otp-input-logic";

// 変換中に桁がそろったときの扱い。
// - blur：focus を外して、変換を確定させ、確定してから完成を知らせる（Mac・Windows の Chrome・Edge。実機で確認）。
// - immediate：変換中のまま、すぐ完成を知らせる。検証に失敗して、親が中身を空にすると、ブラウザが変換を取り消す
//   （Mac の Safari。実機で確認：focus を外すと、変換は確定せず、IME に文字が残って、次に打つ数字と一緒に入ってくる）。
type CompositionCommit = "blur" | "immediate";

function detectCompositionCommit(): CompositionCommit {
	return chooseCompositionStrategy(readBrowserEnvironment()) ===
		"end-then-replace"
		? "blur"
		: "immediate";
}

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
	// 変換中に桁がそろったときの扱い（なければ、ブラウザから判定する）。テストで指定する。
	compositionCommit?: CompositionCommit;
};

// ワンタイムコードの入力欄。
// 本物の入力欄は 1 つで、透明にして、見た目の桁ごとの枠の上に重ねる（欄を移さない）。
// - 日本語入力がオンのままでも、全角の数字を、半角の数字として扱う。変換中は、入力欄の中身を書き換えない。
//   桁がそろったときの扱いは、ブラウザで違う（CompositionCommit を参照）
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
	compositionCommit,
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

	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		const input = event.target;
		// イベント自身の isComposing を優先する（Safari は、確定しても compositionend が届かない）。
		const isComposing =
			(event.nativeEvent as InputEvent).isComposing ?? composingRef.current;
		const commit = compositionCommit ?? detectCompositionCommit();
		// blur で確定させる環境では、変換中に完成を知らせない（確定してから、compositionend で知らせる）。
		const notifyNow = !isComposing || commit === "immediate";
		const nextJoined = update(input.value, notifyNow);

		if (isComposing) {
			if (!notifyNow && nextJoined.length === length) {
				input.blur();
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
