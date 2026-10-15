import {
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";
import * as styles from "./inline-text.css";

type InlineTextProps = {
	value: string;
	onChange: (value: string) => void;
	// 読み上げる名前（例：「卵の分量」）。表示のボタンは「…を編集」になる。
	label: string;
	placeholder: string;
	// 値の見た目を変えたいとき（空のときは、placeholder を薄く出す）。
	display?: ReactNode;
	align?: "start" | "end";
	weight?: "regular" | "strong";
};

// 普段は文字だけ。ホバーで背景がつき、クリックすると入力欄になる。
// Enter・Esc・外側のクリックで確定する（取り消さない）。Enter・Esc のあとは、表示のボタンにフォーカスを戻す。
export function InlineText({
	value,
	onChange,
	label,
	placeholder,
	display,
	align = "start",
	weight = "regular",
}: InlineTextProps) {
	const [isEditing, setIsEditing] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const shouldRestoreFocus = useRef(false);

	useEffect(() => {
		if (isEditing) {
			inputRef.current?.focus();
		} else if (shouldRestoreFocus.current) {
			shouldRestoreFocus.current = false;
			buttonRef.current?.focus();
		}
	}, [isEditing]);

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key !== "Enter" && event.key !== "Escape") {
			return;
		}

		// フォーム全体は保存しない。変換確定の Enter（変換中の Esc）は、IME に任せる。
		event.preventDefault();

		if (!event.nativeEvent.isComposing) {
			shouldRestoreFocus.current = true;
			setIsEditing(false);
		}
	}

	if (isEditing) {
		return (
			<input
				ref={inputRef}
				className={styles.input}
				data-align={align}
				data-weight={weight}
				aria-label={label}
				placeholder={placeholder}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				onBlur={() => setIsEditing(false)}
				onKeyDown={handleKeyDown}
			/>
		);
	}

	const isEmpty = value.trim() === "";

	return (
		<button
			ref={buttonRef}
			className={styles.button}
			type="button"
			data-align={align}
			data-weight={weight}
			data-empty={isEmpty}
			aria-label={`${label}を編集`}
			onClick={() => setIsEditing(true)}
		>
			{isEmpty ? placeholder : (display ?? value)}
		</button>
	);
}
