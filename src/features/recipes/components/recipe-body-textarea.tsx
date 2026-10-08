import {
	type ChangeEvent,
	type CompositionEvent,
	type KeyboardEvent,
	useEffect,
	useEffectEvent,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	type CompositionStrategy,
	chooseCompositionStrategy,
} from "../domain/choose-composition-strategy";
import { continueRecipeList } from "../domain/continue-recipe-list";
import {
	adjustCompletionItem,
	applyRecipeTextCompletion,
	getRecipeTextCompletion,
	type RecipeTextCompletion,
	type RecipeTextCompletionItem,
} from "../domain/get-recipe-text-completions";
import {
	type EditKind,
	editKindOfInput,
	emptyTextHistory,
	recordEdit,
	redoEdit,
	type TextSnapshot,
	undoEdit,
} from "../domain/text-history";
import {
	endComposition,
	restoreFocus,
} from "../infrastructure/end-composition";
import { readBrowserEnvironment } from "../infrastructure/read-browser-environment";
import * as styles from "./recipe-editor.css";

// Safari で、IME の変換と Tab のキーのイベントが、続けて届くとみなす時間（ミリ秒）。
const previousCompletionWindowMs = 100;

// 変換中（IME の入力中）の、変換の前の状態と、変換が始まった位置。
type Composition = { before: TextSnapshot; start: number };

type RecipeBodyTextareaProps = {
	value: string;
	onChange: (value: string) => void;
	// 作り方・下準備の中で補完する、材料名・グループ名。
	recipeNames: readonly string[];
	placeholder?: string;
	// 変換中の補完の方式（なければ、ブラウザから判定する）。テストで指定する。
	compositionStrategy?: CompositionStrategy;
};

// レシピの本文の入力欄。入力欄の下に、補完の候補を出す。
// 候補は、↑↓ で選び、Tab（または、選んだあとの Enter）で決定する。選んでいないときの Enter は、ふつうの改行。Esc で閉じる。
export function RecipeBodyTextarea({
	value,
	onChange,
	recipeNames,
	placeholder,
	compositionStrategy,
}: RecipeBodyTextareaProps) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	// 元に戻す・やり直しの履歴。本文は、値として書き換える（ブラウザの履歴は、使えなくなる）ので、すべて自前で記録する。
	const historyRef = useRef(emptyTextHistory);
	const caretRef = useRef(0);
	const compositionRef = useRef<Composition | null>(null);
	// 変換中に候補を決める処理の間は、変換の終わりを、ここでは記録しない。
	const isAcceptingRef = useRef(false);
	// 変換中の入力の直前に出ていた候補。Safari は、Tab の前に IME が変換して本文が変わってから、キーのイベントが届くので、そのときに使う。
	const previousCompletionRef = useRef<{
		completion: RecipeTextCompletion;
		value: string;
		caret: number;
		at: number;
	} | null>(null);
	const [caret, setCaret] = useState(0);
	const [isFocused, setIsFocused] = useState(false);
	// IME の変換中か。
	const [isComposing, setIsComposing] = useState(false);
	// 変換中の補完の扱い。サーバーと同じ初期値で描画し、ブラウザで判定する。
	const [detectedStrategy, setDetectedStrategy] = useState<CompositionStrategy>(
		"wait-for-confirmation",
	);
	const strategy = compositionStrategy ?? detectedStrategy;
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	// 本文を書き換えたあとに、カーソルを置く位置。
	const [selectionRequest, setSelectionRequest] = useState<{
		caret: number;
	} | null>(null);
	// Esc で閉じた位置。本文かカーソルが動くまで、出さない。
	const [closedAt, setClosedAt] = useState<{
		value: string;
		caret: number;
	} | null>(null);

	useEffect(() => {
		setDetectedStrategy(chooseCompositionStrategy(readBrowserEnvironment()));
	}, []);

	const completion = useMemo(
		() => getRecipeTextCompletion(value, caret, recipeNames),
		[value, caret, recipeNames],
	);
	// 変換中は、変換中の補完に対応した環境だけ、候補を出す（ほかは、確定したあとに出す）。
	const isOpen =
		isFocused &&
		(!isComposing || strategy !== "wait-for-confirmation") &&
		completion !== null &&
		!(closedAt?.value === value && closedAt.caret === caret);

	// 本文を書き換えたあと、本文が更新されてから、カーソルを置く。
	useLayoutEffect(() => {
		if (selectionRequest !== null && textareaRef.current) {
			textareaRef.current.setSelectionRange(
				selectionRequest.caret,
				selectionRequest.caret,
			);
		}
	}, [selectionRequest]);

	// メニューからの「元に戻す」「やり直す」も、自前の履歴で行う（ブラウザの履歴に任せない）。
	const handleHistoryInput = useEffectEvent((event: InputEvent) => {
		if (event.inputType === "historyUndo") {
			event.preventDefault();
			stepHistory("undo");
		} else if (event.inputType === "historyRedo") {
			event.preventDefault();
			stepHistory("redo");
		}
	});

	useEffect(() => {
		const textarea = textareaRef.current;

		if (!textarea) {
			return;
		}

		function listener(event: InputEvent) {
			handleHistoryInput(event);
		}

		textarea.addEventListener("beforeinput", listener);

		return () => textarea.removeEventListener("beforeinput", listener);
	}, []);

	function recordHistory(
		before: TextSnapshot,
		after: TextSnapshot,
		kind: EditKind,
	) {
		historyRef.current = recordEdit(
			historyRef.current,
			before,
			after,
			kind,
			Date.now(),
		);
	}

	function syncCaret(textarea: HTMLTextAreaElement) {
		// Safari は、変換中の文字の範囲全体を選択状態にする。そのときのカーソルは、範囲の末尾。
		const position = compositionRef.current
			? textarea.selectionEnd
			: textarea.selectionStart;

		caretRef.current = position;
		setCaret(position);
		setActiveIndex(null);
	}

	// 本文を書き換える（履歴の記録は、呼び出し側で行う）。
	function writeText(next: TextSnapshot) {
		caretRef.current = next.caret;
		onChange(next.text);
		setSelectionRequest({ caret: next.caret });
		setCaret(next.caret);
		setActiveIndex(null);
	}

	// 補完や番号の自動入力による編集。1回で元に戻せるよう、履歴に記録する。
	function edit(next: TextSnapshot) {
		const textarea = textareaRef.current;

		recordHistory(
			{
				text: value,
				caret: textarea?.selectionStart ?? caretRef.current,
			},
			next,
			"other",
		);
		writeText(next);
	}

	function stepHistory(direction: "undo" | "redo") {
		const textarea = textareaRef.current;

		if (!textarea) {
			return;
		}

		const current = { text: textarea.value, caret: textarea.selectionStart };
		const result = (direction === "undo" ? undoEdit : redoEdit)(
			historyRef.current,
			current,
		);

		if (result) {
			historyRef.current = result.history;
			writeText(result.snapshot);
		}
	}

	function accept(index: number) {
		if (!completion) {
			return;
		}

		const result = applyRecipeTextCompletion(value, completion, index);

		edit({ text: result.text, caret: result.caret });
	}

	// 変換中に候補を決める。Chromium 系は、変換を確定させてから、確定した文字を含めて置き換える。Safari は、変換中のまま書き換える（ブラウザが変換を取り消す）。
	// source は、候補を計算したときの本文とカーソル（変換で長さが変わった分を、置き換える範囲に反映する。元に戻すで、この状態に戻る）。
	async function acceptDuringComposition(
		item: RecipeTextCompletionItem,
		source: TextSnapshot,
	) {
		const textarea = textareaRef.current;
		const composition = compositionRef.current;

		if (!textarea || !composition || isAcceptingRef.current) {
			return;
		}

		isAcceptingRef.current = true;

		const shouldEnd = strategy === "end-then-replace";

		if (shouldEnd) {
			await endComposition(textarea);
		}

		const committed = textarea.value;
		const committedSnapshot = {
			text: committed,
			caret: textarea.selectionStart,
		};
		const result = applyRecipeTextCompletion(
			committed,
			{
				items: [
					adjustCompletionItem(item, {
						start: composition.start,
						delta: committed.length - source.text.length,
					}),
				],
			},
			0,
		);
		const next = { text: result.text, caret: result.caret };

		// 変換中の文字（「とま」）の段階を、履歴に残す。Safari は、確定を待たずに置き換えるので、候補を計算したときの本文を使う（Tab で IME が先に変換した文字ではなく）。
		const middle = shouldEnd ? committedSnapshot : source;

		recordHistory(composition.before, middle, "other");
		recordHistory(middle, next, "other");

		compositionRef.current = null;
		isAcceptingRef.current = false;
		setIsComposing(false);
		writeText(next);

		if (shouldEnd) {
			restoreFocus(textarea, next.caret);
		}
	}

	function handleCompositionStart(
		event: CompositionEvent<HTMLTextAreaElement>,
	) {
		const textarea = event.currentTarget;

		compositionRef.current = {
			before: { text: textarea.value, caret: textarea.selectionStart },
			start: textarea.selectionStart,
		};
		setIsComposing(true);
	}

	function handleCompositionEnd(event: CompositionEvent<HTMLTextAreaElement>) {
		const composition = compositionRef.current;

		// 候補を決める処理が、すでに扱っているときは、ここでは何もしない。
		if (!composition || isAcceptingRef.current) {
			return;
		}

		compositionRef.current = null;
		setIsComposing(false);

		const textarea = event.currentTarget;

		recordHistory(
			composition.before,
			{ text: textarea.value, caret: textarea.selectionStart },
			"other",
		);
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
		edit({ text: result.text, caret: result.caret });
	}

	// 変換中の Tab で使う候補。今出ている候補。なければ、Safari の方式のときだけ、直前の入力（IME の変換）の前に出ていた候補。
	function findCompletionForTab(): {
		completion: RecipeTextCompletion;
		value: string;
		caret: number;
	} | null {
		if (isOpen && completion) {
			return { completion, value, caret };
		}

		const previous = previousCompletionRef.current;

		if (
			strategy === "replace-in-place" &&
			previous &&
			performance.now() - previous.at < previousCompletionWindowMs
		) {
			return previous;
		}

		return null;
	}

	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
		// 変換中の操作は、IME に任せる。ただし、候補が出ているときの Tab は、IME の変換候補ではなく、補完の決定に使う。
		if (event.nativeEvent.isComposing) {
			if (event.code === "Tab" && !event.shiftKey && compositionRef.current) {
				const shown = findCompletionForTab();

				if (shown) {
					event.preventDefault();
					void acceptDuringComposition(
						shown.completion.items[activeIndex ?? 0],
						{ text: shown.value, caret: shown.caret },
					);
				}
			}

			return;
		}

		// 元に戻す・やり直す（Cmd/Ctrl+Z、Cmd/Ctrl+Shift+Z、Ctrl+Y）は、自前の履歴で行う。
		if ((event.metaKey || event.ctrlKey) && !event.altKey) {
			const key = event.key.toLowerCase();

			if (key === "z") {
				event.preventDefault();
				stepHistory(event.shiftKey ? "redo" : "undo");

				return;
			}

			if (key === "y" && !event.metaKey) {
				event.preventDefault();
				stepHistory("redo");

				return;
			}
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
		const textarea = event.target;

		// 変換中の入力は、変換が終わったときに、まとめて記録する。
		if (compositionRef.current) {
			previousCompletionRef.current =
				isOpen && completion
					? { completion, value, caret, at: performance.now() }
					: null;
		} else {
			recordHistory(
				{ text: value, caret: caretRef.current },
				{ text: textarea.value, caret: textarea.selectionStart },
				editKindOfInput((event.nativeEvent as InputEvent).inputType),
			);
		}

		onChange(textarea.value);
		syncCaret(textarea);
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
					onCompositionStart={handleCompositionStart}
					onCompositionEnd={handleCompositionEnd}
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
									// 入力欄のフォーカスを外さないよう、押した時点で決定する（変換中は、変換を確定させてから置き換える）。
									onMouseDown={(event) => {
										event.preventDefault();

										if (compositionRef.current) {
											void acceptDuringComposition(item, {
												text: value,
												caret,
											});
										} else {
											accept(index);
										}
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
