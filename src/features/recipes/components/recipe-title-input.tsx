import { type KeyboardEvent, useEffect, useRef } from "react";
import * as styles from "./recipe-editor.css";

type RecipeTitleInputProps = {
	value: string;
	onChange: (value: string) => void;
	isEditing: boolean;
	onEditingChange: (isEditing: boolean) => void;
};

// タイトルを、見出しとして表示し、クリックすると、その場で編集できる。Enter・Esc か、外側のクリックで確定する。
export function RecipeTitleInput({
	value,
	onChange,
	isEditing,
	onEditingChange,
}: RecipeTitleInputProps) {
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isEditing) {
			inputRef.current?.focus();
		}
	}, [isEditing]);

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		// Esc でも、入力した内容のまま、確定する（取り消さない）。
		if (event.key !== "Enter" && event.key !== "Escape") {
			return;
		}

		// 変換確定の Enter（変換中の Esc）は、IME に任せる。フォーム全体は、保存しない。
		event.preventDefault();

		if (!event.nativeEvent.isComposing) {
			onEditingChange(false);
		}
	}

	if (isEditing) {
		return (
			<input
				ref={inputRef}
				className={styles.titleInput}
				aria-label="レシピ名"
				placeholder="無題のレシピ"
				value={value}
				onChange={(event) => onChange(event.target.value)}
				onBlur={() => onEditingChange(false)}
				onKeyDown={handleKeyDown}
			/>
		);
	}

	return (
		<h2 className={styles.title}>
			<button
				className={
					value.trim() === "" ? styles.titlePlaceholder : styles.titleButton
				}
				type="button"
				aria-label="レシピ名を編集"
				onClick={() => onEditingChange(true)}
			>
				{value.trim() === "" ? "無題のレシピ" : value}
			</button>
		</h2>
	);
}
