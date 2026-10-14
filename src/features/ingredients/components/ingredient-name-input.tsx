import { type KeyboardEvent, useId, useMemo, useState } from "react";
import {
	findIngredientCatalogEntry,
	type IngredientCatalogEntry,
	searchIngredientCatalog,
} from "../domain/ingredient-catalog";
import * as styles from "./ingredient-name-input.css";

type IngredientNameInputProps = {
	id: string;
	name?: string;
	value: string;
	onChange: (value: string) => void;
	// 候補を選んだとき（名前は、onChange にも渡される）。
	onSelectEntry?: (entry: IngredientCatalogEntry) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	// 候補の右に出す補足（例：カテゴリ名）。
	describeEntry?: (entry: IngredientCatalogEntry) => string | undefined;
};

// 食材名の入力欄。入力に合わせて、食材カタログから候補を出す（在庫の登録と、買い物メモで共通）。
// 候補は、選ぶだけで入力に反映される。候補に出ない名前も、そのまま入力できる。
export function IngredientNameInput({
	id,
	name,
	value,
	onChange,
	onSelectEntry,
	placeholder,
	className,
	disabled,
	describeEntry,
}: IngredientNameInputProps) {
	const listboxId = useId();
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);

	const suggestions = useMemo(() => searchIngredientCatalog(value), [value]);

	// 入力がカタログの名前と一致しているときは、候補を出さない（確定済みとみなす）。
	const isVisible =
		isOpen &&
		suggestions.length > 0 &&
		findIngredientCatalogEntry(value) === undefined;

	function select(entry: IngredientCatalogEntry) {
		onChange(entry.name);
		onSelectEntry?.(entry);
		setIsOpen(false);
		setActiveIndex(-1);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.key === "Escape") {
			setIsOpen(false);
			setActiveIndex(-1);

			return;
		}

		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			if (suggestions.length === 0) {
				return;
			}

			event.preventDefault();
			setIsOpen(true);

			const step = event.key === "ArrowDown" ? 1 : -1;

			setActiveIndex(
				(current) => (current + step + suggestions.length) % suggestions.length,
			);

			return;
		}

		// 矢印で候補を選んでいるときだけ、Enter を候補の決定にする（それ以外は、フォームの送信のまま）。
		if (event.key === "Enter" && isVisible && activeIndex >= 0) {
			const activeEntry = suggestions[activeIndex];

			if (activeEntry) {
				event.preventDefault();
				select(activeEntry);
			}
		}
	}

	return (
		<div className={styles.container}>
			<input
				className={className}
				id={id}
				name={name}
				value={value}
				placeholder={placeholder}
				disabled={disabled}
				autoComplete="off"
				role="combobox"
				aria-expanded={isVisible}
				aria-controls={isVisible ? listboxId : undefined}
				aria-autocomplete="list"
				aria-activedescendant={
					isVisible && activeIndex >= 0
						? `${listboxId}-${activeIndex}`
						: undefined
				}
				onChange={(event) => {
					onChange(event.target.value);
					setIsOpen(true);
					setActiveIndex(-1);
				}}
				onFocus={() => setIsOpen(true)}
				onBlur={() => {
					setIsOpen(false);
					setActiveIndex(-1);
				}}
				onKeyDown={handleKeyDown}
			/>

			{isVisible ? (
				<div className={styles.list} role="listbox" id={listboxId}>
					{suggestions.map((entry, index) => (
						<button
							className={styles.option}
							type="button"
							role="option"
							tabIndex={-1}
							id={`${listboxId}-${index}`}
							aria-selected={index === activeIndex}
							key={entry.id}
							// 入力欄からフォーカスを外さずに選べるようにする。
							onMouseDown={(event) => event.preventDefault()}
							onClick={() => select(entry)}
						>
							<span className={styles.label}>
								{entry.name.startsWith(value.trim()) && value.trim() !== "" ? (
									<>
										<b>{value.trim()}</b>
										{entry.name.slice(value.trim().length)}
									</>
								) : (
									entry.name
								)}
							</span>
							<span className={styles.sub}>{describeEntry?.(entry)}</span>
						</button>
					))}
				</div>
			) : null}
		</div>
	);
}
