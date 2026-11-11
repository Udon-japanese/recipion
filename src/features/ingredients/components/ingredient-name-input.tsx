import {
	type ChangeEvent,
	type KeyboardEvent,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { CompletionHint } from "#/components/completion-menu/completion-hint";
import { CompletionMenu } from "#/components/completion-menu/completion-menu";
import { useCompletionLayout } from "#/components/completion-menu/use-completion-layout";
import type { CompositionStrategy } from "#/ime/choose-composition-strategy";
import { readCompletionKey, stepCompletionIndex } from "#/ime/completion-keys";
import {
	type ShownCompletion,
	useCompositionCompletion,
} from "#/ime/use-composition-completion";
import {
	findIngredientCatalogEntry,
	type IngredientCatalogEntry,
} from "../domain/ingredient-catalog";
import type { IngredientDictionary } from "../domain/ingredient-dictionary";
import {
	type IngredientSuggestion,
	searchIngredientNames,
} from "../domain/search-ingredient-names";
import { useIngredientDictionaryContext } from "./ingredient-dictionary-context";
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
	// 変換中の補完の方式（なければ、ブラウザから判定する）。テストで指定する。
	compositionStrategy?: CompositionStrategy;
	// ユーザーの食材辞書（自分の材料も、候補に出す）。省略すると、画面の IngredientDictionaryProvider のもの（なければ、カタログだけ）。
	dictionary?: IngredientDictionary;
};

// 自分の材料（カタログにない、辞書の食材）の候補に出す印。
const ownBadge = "自分の材料";

// 食材名の入力欄。入力に合わせて、食材カタログから候補を、近い順にすべて出す（在庫の登録と、買い物メモで共通）。
// 候補は、選ぶだけで入力に反映される。候補に出ない名前も、そのまま入力できる。
// 変換中の扱い・キー操作・候補の出し方は、レシピの本文の補完と共通（useCompositionCompletion・completion-keys・CompletionMenu）。
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
	compositionStrategy,
	dictionary,
}: IngredientNameInputProps) {
	const listboxId = useId();
	const inputRef = useRef<HTMLInputElement>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	const [caret, setCaret] = useState(0);
	// PC の一覧が、いま見えているか（変換中に、上に入らず隠しているときは、閉じている扱い）。
	const [isMenuShown, setIsMenuShown] = useState(false);
	const layout = useCompletionLayout();
	const composing = useCompositionCompletion<IngredientSuggestion[]>({
		fieldRef: inputRef,
		strategy: compositionStrategy,
		apply: (completion, index) => {
			const entry = completion[index];

			if (!entry) {
				return { text: value, caret };
			}

			select(entry);

			return { text: entry.name, caret: entry.name.length };
		},
	});

	const contextDictionary = useIngredientDictionaryContext();
	const activeDictionary = dictionary ?? contextDictionary;
	const suggestions = useMemo(
		() => searchIngredientNames(value, activeDictionary),
		[value, activeDictionary],
	);

	// 入力がカタログの名前と完全に一致しているときは、確定済みとみなして、候補を出さない。
	// ただし、変換中は出す（変換が終わる前に、候補から選べるように）。変換中に出せない環境は、確定してから出す。
	const isVisible =
		isOpen &&
		suggestions.length > 0 &&
		composing.canCompleteWhileComposing &&
		(composing.isComposing ||
			(findIngredientCatalogEntry(value) === undefined &&
				!suggestions.some((suggestion) => suggestion.name === value)));
	const isExpanded = isVisible && isMenuShown;
	const shown: ShownCompletion<IngredientSuggestion[]> | null = isExpanded
		? { completion: suggestions, count: suggestions.length, text: value, caret }
		: null;

	// 候補の右の補足：カタログの食材は、呼ぶ側が決める（カテゴリ名など）。自分の材料は「自分の材料」。
	function badgeOf(suggestion: IngredientSuggestion): string | undefined {
		return suggestion.entry ? describeEntry?.(suggestion.entry) : ownBadge;
	}

	function close() {
		setIsOpen(false);
		setActiveIndex(null);
	}

	function select(suggestion: IngredientSuggestion) {
		onChange(suggestion.name);

		if (suggestion.entry) {
			onSelectEntry?.(suggestion.entry);
		}

		close();
	}

	function moveActive(direction: "up" | "down") {
		setIsOpen(true);
		setActiveIndex((current) =>
			stepCompletionIndex(current, direction, suggestions.length),
		);
	}

	// キー操作（決まりは readCompletionKey。変換中のキーは useCompositionCompletion）。
	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (
			composing.handleKeyDown(event, {
				shown,
				activeIndex,
				moveActive,
			})
		) {
			return;
		}

		const key = readCompletionKey(event, false);

		if (key === "close") {
			// 候補が出ているときは、シートごと閉じないよう、ここで止めて、候補だけ閉じる。
			if (isExpanded) {
				event.preventDefault();
				event.stopPropagation();
			}

			close();

			return;
		}

		// ↑↓ は、閉じている一覧も開く。
		if (key === "up" || key === "down") {
			if (suggestions.length > 0) {
				event.preventDefault();
				moveActive(key);
			}

			return;
		}

		if (!isExpanded) {
			return;
		}

		if (key === "accept") {
			// 決めると候補が消えるので、次の Tab で、次の欄へ移る。
			const entry = suggestions[activeIndex ?? 0];

			if (entry) {
				event.preventDefault();
				select(entry);
			}
		} else if (key === "accept-selected" && activeIndex !== null) {
			// 選んでいないときの Enter は、フォームの送信のまま。
			const entry = suggestions[activeIndex];

			if (entry) {
				event.preventDefault();
				select(entry);
			}
		}
	}

	function handleChange(event: ChangeEvent<HTMLInputElement>) {
		// 変換中の入力の直前に出ていた候補を覚える（Safari の Tab のため）。
		composing.noteChange(shown);
		onChange(event.target.value);
		setCaret(composing.readCaret(event.target));
		setIsOpen(true);
		setActiveIndex(null);
	}

	return (
		<div className={styles.container}>
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
				aria-expanded={isExpanded}
				aria-controls={isExpanded ? listboxId : undefined}
				aria-autocomplete="list"
				aria-activedescendant={
					isExpanded && activeIndex !== null
						? `${listboxId}-${activeIndex}`
						: undefined
				}
				onChange={handleChange}
				onSelect={(event) => setCaret(composing.readCaret(event.currentTarget))}
				onCompositionStart={composing.onCompositionStart}
				onCompositionEnd={composing.onCompositionEnd}
				onFocus={() => setIsOpen(true)}
				onBlur={close}
				onKeyDown={handleKeyDown}
			/>

			<CompletionMenu
				textareaRef={inputRef}
				layout={layout}
				anchor="field"
				listboxId={listboxId}
				open={isVisible}
				caret={caret}
				items={suggestions.map((suggestion) => ({
					key: suggestion.key,
					label: suggestion.name,
					badge: badgeOf(suggestion),
				}))}
				activeIndex={activeIndex}
				onAccept={(index) => {
					const entry = suggestions[index];

					if (entry) {
						composing.acceptChosen(
							suggestions,
							index,
							{ text: value, caret },
							() => select(entry),
						);
					}
				}}
				// 変換中・確定の直後は、IME の窓（文字の下に出る）を避けて、入力欄の上に出す。
				prefer={composing.prefersAbove(value) ? "above" : "below"}
				hint={<CompletionHint isComposing={composing.isComposing} />}
				// 変換中に、上に入らないときは、IME の窓に重ならないよう、出さない。
				hideBelow={composing.isComposing}
				onShownChange={setIsMenuShown}
			/>
		</div>
	);
}
