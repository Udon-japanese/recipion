import {
	type ChangeEvent,
	type KeyboardEvent,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { continueRecipeList } from "../domain/continue-recipe-list";
import {
	applyRecipeTextCompletion,
	getRecipeTextCompletion,
} from "../domain/get-recipe-text-completions";
import * as styles from "./recipe-editor.css";

// 本文の書き換えを、ブラウザの入力として行う（元に戻す Ctrl+Z の履歴に残るようにする）。
// 書き換え前後の違う部分だけを選んで、そこに挿入する。使えない環境では、false を返す。
function replaceTextNatively(
	textarea: HTMLTextAreaElement,
	nextText: string,
	caret: number,
): boolean {
	if (typeof document.execCommand !== "function") {
		return false;
	}

	const current = textarea.value;
	let prefix = 0;

	while (
		prefix < current.length &&
		prefix < nextText.length &&
		current[prefix] === nextText[prefix]
	) {
		prefix += 1;
	}

	let suffix = 0;

	while (
		suffix < current.length - prefix &&
		suffix < nextText.length - prefix &&
		current[current.length - 1 - suffix] ===
			nextText[nextText.length - 1 - suffix]
	) {
		suffix += 1;
	}

	const inserted = nextText.slice(prefix, nextText.length - suffix);

	textarea.setSelectionRange(prefix, current.length - suffix);

	const isDone =
		inserted === ""
			? document.execCommand("delete")
			: document.execCommand("insertText", false, inserted);

	if (isDone) {
		textarea.setSelectionRange(caret, caret);
	}

	return isDone;
}

type RecipeBodyTextareaProps = {
	value: string;
	onChange: (value: string) => void;
	// 作り方・下準備の中で補完する、材料名・グループ名。
	recipeNames: readonly string[];
	placeholder?: string;
};

// レシピの本文の入力欄。入力欄の下に、補完の候補を出す。
// 候補は、↑↓ で選び、Tab（または、選んだあとの Enter）で決定する。選んでいないときの Enter は、ふつうの改行。Esc で閉じる。
export function RecipeBodyTextarea({
	value,
	onChange,
	recipeNames,
	placeholder,
}: RecipeBodyTextareaProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const pendingCaret = useRef<number | null>(null);
	const [caret, setCaret] = useState(0);
	const [isFocused, setIsFocused] = useState(false);
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	// Esc で閉じた位置。本文かカーソルが動くまで、出さない。
	const [closedAt, setClosedAt] = useState<{
		value: string;
		caret: number;
	} | null>(null);

	const completion = useMemo(
		() => getRecipeTextCompletion(value, caret, recipeNames),
		[value, caret, recipeNames],
	);
	const isOpen =
		isFocused &&
		completion !== null &&
		!(closedAt?.value === value && closedAt.caret === caret);

	// 候補を入れたあと、本文が更新されてから、カーソルを置く。
	// biome-ignore lint/correctness/useExhaustiveDependencies: 本文が更新されたときに、置く。
	useLayoutEffect(() => {
		if (pendingCaret.current !== null && textareaRef.current) {
			textareaRef.current.setSelectionRange(
				pendingCaret.current,
				pendingCaret.current,
			);
			pendingCaret.current = null;
		}
	}, [value]);

	function syncCaret(textarea: HTMLTextAreaElement) {
		setCaret(textarea.selectionStart);
		setActiveIndex(null);
	}

	// 書き換えた本文を、入力欄に反映する。
	function commit(result: { text: string; caret: number }) {
		const textarea = textareaRef.current;

		if (textarea && replaceTextNatively(textarea, result.text, result.caret)) {
			// 入力として扱われたので、onChange（本文の更新）は、入力のイベントで呼ばれる。
			setCaret(result.caret);
			setActiveIndex(null);

			return;
		}

		pendingCaret.current = result.caret;
		onChange(result.text);
		setCaret(result.caret);
		setActiveIndex(null);
	}

	function accept(index: number) {
		if (!completion) {
			return;
		}

		commit(applyRecipeTextCompletion(value, completion, index));
	}

	// 番号・中黒の行で Enter を押したら、次の行にも印を付ける（Shift+Enter は、ふつうの改行）。
	function continueList(event: KeyboardEvent<HTMLTextAreaElement>) {
		if (
			event.key !== "Enter" ||
			event.shiftKey ||
			event.ctrlKey ||
			event.metaKey ||
			event.nativeEvent.isComposing
		) {
			return;
		}

		const textarea = event.currentTarget;
		const result = continueRecipeList(
			value,
			textarea.selectionStart,
			textarea.selectionEnd,
		);

		if (!result) {
			return;
		}

		event.preventDefault();
		commit(result);
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		// 変換中の操作は、IME に任せる。
		if (event.nativeEvent.isComposing) {
			return;
		}

		if (!isOpen || !completion) {
			continueList(event);

			return;
		}

		const lastIndex = completion.items.length - 1;

		switch (event.key) {
			case "ArrowDown":
				event.preventDefault();
				setActiveIndex((current) =>
					current === null ? 0 : Math.min(current + 1, lastIndex),
				);
				break;
			case "ArrowUp":
				event.preventDefault();
				setActiveIndex((current) =>
					current === null ? lastIndex : Math.max(current - 1, 0),
				);
				break;
			case "Tab":
				event.preventDefault();
				accept(activeIndex ?? 0);
				break;
			case "Enter":
				if (activeIndex !== null) {
					event.preventDefault();
					accept(activeIndex);
				} else {
					continueList(event);
				}
				break;
			case "Escape":
				event.preventDefault();
				setClosedAt({ value, caret });
				break;
		}
	}

	function handleChange(event: ChangeEvent<HTMLTextAreaElement>) {
		onChange(event.target.value);
		syncCaret(event.target);
	}

	return (
		<div className={styles.completionWrap}>
			<label className={styles.field}>
				<span>レシピの本文</span>
				<textarea
					ref={textareaRef}
					className={styles.bodyTextarea}
					value={value}
					placeholder={placeholder}
					onChange={handleChange}
					onSelect={(event) => syncCaret(event.currentTarget)}
					onKeyDown={handleKeyDown}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
				/>
			</label>

			{isOpen && completion ? (
				<div className={styles.completionBox}>
					<ul className={styles.completionList} aria-label="補完の候補">
						{completion.items.map((item, index) => (
							<li key={item.label}>
								<button
									type="button"
									className={styles.completionItem}
									// Tab は、候補の決定に使う。ボタンへは移らない。
									tabIndex={-1}
									aria-current={activeIndex === index}
									// 入力欄のフォーカスを外さないよう、押した時点で決定する。
									onMouseDown={(event) => {
										event.preventDefault();
										accept(index);
									}}
								>
									{item.label}
								</button>
							</li>
						))}
					</ul>
					<p className={styles.hint}>↑↓で選び、Tab で決定（Esc で閉じる）</p>
				</div>
			) : null}
		</div>
	);
}
