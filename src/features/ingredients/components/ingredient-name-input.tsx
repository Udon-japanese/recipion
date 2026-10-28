import {
	type KeyboardEvent,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { CompletionMenu } from "#/components/completion-menu/completion-menu";
import { useCompletionLayout } from "#/components/completion-menu/use-completion-layout";
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
	// 日本語の変換中か。
	const [isComposing, setIsComposing] = useState(false);
	// 変換中に、一覧を入力欄の上に出せるか（上に、一覧が入る余白があるとき）。
	const [hasRoomAbove, setHasRoomAbove] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	// スマホ（タッチ）は、キーボードの上の帯に出す（レシピの本文の補完と同じ）。
	const layout = useCompletionLayout();

	const suggestions = useMemo(() => searchIngredientCatalog(value), [value]);

	// 入力がカタログの名前と完全に一致しているときは、確定済みとみなして、候補を出さない。
	// ただし、変換中は出す（変換が終わる前に、候補から選べるように）。
	const isVisible =
		isOpen &&
		suggestions.length > 0 &&
		(isComposing || findIngredientCatalogEntry(value) === undefined);

	// 変換中は、上に出す。ただし、上に入りきらないときは、下のまま（画面からはみ出さない）。
	useLayoutEffect(() => {
		const container = containerRef.current;
		const list = listRef.current;

		if (!isVisible || !isComposing || !container || !list) {
			return;
		}

		const next = container.getBoundingClientRect().top >= list.offsetHeight + 6;

		setHasRoomAbove((current) => (current === next ? current : next));
	});

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
		<div className={styles.container} ref={containerRef}>
			<input
				ref={inputRef}
				className={className}
				id={id}
				name={name}
				value={value}
				placeholder={placeholder}
				disabled={disabled}
				autoComplete="off"
				role="combobox"
				aria-expanded={isVisible}
				aria-controls={
					isVisible && layout !== "keyboard-bar" ? listboxId : undefined
				}
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
				onCompositionStart={() => setIsComposing(true)}
				onCompositionEnd={() => setIsComposing(false)}
				onFocus={() => setIsOpen(true)}
				onBlur={() => {
					setIsOpen(false);
					setActiveIndex(-1);
				}}
				onKeyDown={handleKeyDown}
			/>

			{isVisible && layout === "keyboard-bar" ? (
				<CompletionMenu
					textareaRef={inputRef}
					layout="keyboard-bar"
					open
					caret={0}
					items={suggestions.map((entry) => ({
						key: entry.id,
						label: entry.name,
						badge: describeEntry?.(entry),
					}))}
					activeIndex={activeIndex >= 0 ? activeIndex : null}
					onAccept={(index) => {
						const entry = suggestions[index];

						if (entry) {
							select(entry);
						}
					}}
				/>
			) : null}

			{isVisible && layout !== "keyboard-bar" ? (
				<div
					className={styles.list}
					role="listbox"
					id={listboxId}
					ref={listRef}
					data-above={isComposing && hasRoomAbove}
				>
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
