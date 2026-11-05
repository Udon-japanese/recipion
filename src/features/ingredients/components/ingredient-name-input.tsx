import {
	type KeyboardEvent,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { CompletionHint } from "#/components/completion-menu/completion-hint";
import { CompletionMenu } from "#/components/completion-menu/completion-menu";
import {
	badge,
	popupHint,
	popupItem,
} from "#/components/completion-menu/completion-menu.css";
import { placePopup } from "#/components/completion-menu/place-popup";
import { useCompletionLayout } from "#/components/completion-menu/use-completion-layout";
import type { CompositionStrategy } from "#/ime/choose-composition-strategy";
import {
	type CompletionKey,
	previousCompletionWindowMs,
	readCompletionKey,
	stepCompletionIndex,
} from "#/ime/completion-keys";
import { endComposition, restoreFocus } from "#/ime/end-composition";
import { useCompositionStrategy } from "#/ime/use-composition-strategy";
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

// PC の一覧の位置（画面の左上が基準）。
type ListPosition = {
	top: number;
	left: number;
	width: number;
	maxHeight: number;
	// 変換中に、上に入る余白がないとき（下に出すと、IME の変換候補の窓に隠れる）。
	isHidden: boolean;
};

// 一覧の高さの上限（画面が低いときは、画面の 4 割まで）。
const maxListHeight = 280;
// 入力欄と一覧のすき間、画面の端に残す余白。
const listGap = 6;
const viewportMargin = 8;

// 食材名の入力欄。入力に合わせて、食材カタログから候補を出す（在庫の登録と、買い物メモで共通）。
// 候補は、選ぶだけで入力に反映される。候補に出ない名前も、そのまま入力できる。
// キー操作は、レシピの本文の補完と同じ（ime/completion-keys.ts）。
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
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState<number | null>(null);
	// 日本語の変換中か。
	const [isComposing, setIsComposing] = useState(false);
	const [position, setPosition] = useState<ListPosition | null>(null);
	// スクロール・画面の大きさの変化で、測り直す合図。
	const [, setLayoutTick] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const popupRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	// スマホ（タッチ）は、キーボードの上の帯に出す（レシピの本文の補完と同じ）。
	const layout = useCompletionLayout();
	const strategy = useCompositionStrategy(compositionStrategy);
	// 変換中の入力の直前に出ていた候補。Safari は、Tab の前に IME が変換して入力が変わってから、キーのイベントが届くので、そのときに使う。
	const previousRef = useRef<{
		suggestions: IngredientSuggestion[];
		at: number;
	} | null>(null);
	// 変換中に候補を決める処理の最中（変換を確定させるのを待っている間）。
	const isAcceptingRef = useRef(false);

	const contextDictionary = useIngredientDictionaryContext();
	const activeDictionary = dictionary ?? contextDictionary;
	const suggestions = useMemo(
		() => searchIngredientNames(value, activeDictionary),
		[value, activeDictionary],
	);

	// 入力がカタログの名前と完全に一致しているときは、確定済みとみなして、候補を出さない。
	// ただし、変換中は出す（変換が終わる前に、候補から選べるように）。
	const isVisible =
		isOpen &&
		suggestions.length > 0 &&
		(isComposing ||
			(findIngredientCatalogEntry(value) === undefined &&
				!suggestions.some((suggestion) => suggestion.name === value)));

	const isPopup = isVisible && layout !== "keyboard-bar";

	useEffect(() => {
		if (!isPopup) {
			return;
		}

		const update = () => setLayoutTick((tick) => tick + 1);

		// シートの本文など、どの枠のスクロールでも追う（scroll は泡立たないので、捕捉で受ける）。
		window.addEventListener("scroll", update, true);
		window.addEventListener("resize", update);

		return () => {
			window.removeEventListener("scroll", update, true);
			window.removeEventListener("resize", update);
		};
	}, [isPopup]);

	// PC：一覧を、入力欄の下に置く。変換中は、IME の変換候補の窓（文字の下に出る）を避けて、上に置く（入らなければ、縮める）。
	// 毎回の描画のあとに測る（結果が同じなら、状態を更新しないので、繰り返さない）。
	useLayoutEffect(() => {
		const input = inputRef.current;
		const popup = popupRef.current;
		const list = listRef.current;

		if (!isPopup || !input || !popup || !list) {
			setPosition((current) => (current === null ? current : null));

			return;
		}

		const box = input.getBoundingClientRect();
		const viewport = { width: window.innerWidth, height: window.innerHeight };
		const capHeight = Math.min(maxListHeight, viewport.height * 0.4);
		// 縮めているときも、本来の高さで決める（一覧の中で隠れている分を足す）。
		const height = Math.min(
			popup.offsetHeight + Math.max(0, list.scrollHeight - list.clientHeight),
			capHeight,
		);
		const placed = placePopup({
			caret: { top: box.top, left: box.left, height: box.height },
			popup: { width: box.width, height },
			viewport,
			prefer: isComposing ? "above" : "below",
			gap: listGap,
			margin: viewportMargin,
		});
		const aboveBottom = box.top - listGap;
		const top =
			placed.side === "below"
				? placed.top
				: Math.max(viewportMargin, aboveBottom - height);
		const next: ListPosition = {
			top,
			left: placed.left,
			width: box.width,
			// 画面の内に収める（入らない分は、一覧の中でスクロールする）。
			maxHeight: Math.max(
				0,
				placed.side === "below"
					? Math.min(capHeight, viewport.height - viewportMargin - top)
					: aboveBottom - top,
			),
			isHidden: isComposing && placed.side === "below",
		};

		setPosition((current) =>
			current &&
			current.top === next.top &&
			current.left === next.left &&
			current.width === next.width &&
			current.maxHeight === next.maxHeight &&
			current.isHidden === next.isHidden
				? current
				: next,
		);
	});

	// 一覧が見えているか（変換中に、上に入らず、隠しているときは、閉じている扱い）。
	const isExpanded = isVisible && !(isPopup && position?.isHidden);
	// 一覧の下の、キー操作の案内（本文の補完と同じ）。変換中に候補を出さない環境の変換中は、キーを IME に任せるので、出さない。
	const hint =
		isComposing && strategy === "wait-for-confirmation" ? null : (
			<CompletionHint isComposing={isComposing} />
		);

	// 候補の右の補足：カタログの食材は、呼ぶ側が決める（カテゴリ名など）。自分の材料は「自分の材料」。
	function badgeOf(suggestion: IngredientSuggestion): string | undefined {
		return suggestion.entry ? describeEntry?.(suggestion.entry) : ownBadge;
	}

	function select(suggestion: IngredientSuggestion) {
		onChange(suggestion.name);

		if (suggestion.entry) {
			onSelectEntry?.(suggestion.entry);
		}

		setIsOpen(false);
		setActiveIndex(null);
	}

	// 変換中に、候補を決める。Chromium 系は、変換を確定させてから置き換え、フォーカスを戻す。
	// Safari・Android は、変換中のまま置き換える（ブラウザが変換を取り消す）。
	async function selectWhileComposing(entry: IngredientSuggestion) {
		const input = inputRef.current;

		if (!input || isAcceptingRef.current) {
			return;
		}

		isAcceptingRef.current = true;

		const shouldEnd = strategy === "end-then-replace";

		if (shouldEnd) {
			await endComposition(input);
		}

		isAcceptingRef.current = false;
		setIsComposing(false);
		select(entry);

		if (shouldEnd) {
			restoreFocus(input, entry.name.length);
		}
	}

	// キー操作の対象の候補。
	// - 一覧が出ていれば、その候補。変換していないときの ↑↓ は、閉じている一覧も開く。
	// - 変換中で出ていなければ、Safari の方式のときだけ、直前の入力（IME の変換）の前に出ていた候補。
	function findKeyTargets(
		key: CompletionKey | null,
		isComposingKey: boolean,
	): readonly IngredientSuggestion[] {
		if (isExpanded || (!isComposingKey && (key === "up" || key === "down"))) {
			return suggestions;
		}

		const previous = previousRef.current;

		return isComposingKey &&
			strategy === "replace-in-place" &&
			previous &&
			performance.now() - previous.at < previousCompletionWindowMs
			? previous.suggestions
			: [];
	}

	// キー操作（決まりは readCompletionKey。レシピの本文の補完と同じ）。
	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		const isComposingKey = event.nativeEvent.isComposing;

		// 変換中に候補を出さない環境（iPhone・Firefox など）は、変換中のキーを、すべて IME に任せる。
		if (isComposingKey && strategy === "wait-for-confirmation") {
			return;
		}

		const key = readCompletionKey(event, isComposingKey);

		if (key === "close") {
			// 候補が出ているときは、シートごと閉じないよう、ここで止めて、候補だけ閉じる。
			if (isExpanded) {
				event.preventDefault();
				event.stopPropagation();
			}

			setIsOpen(false);
			setActiveIndex(null);

			return;
		}

		const targets = findKeyTargets(key, isComposingKey);

		if (targets.length === 0) {
			return;
		}

		if (key === "up" || key === "down") {
			event.preventDefault();
			setIsOpen(true);
			setActiveIndex((current) =>
				stepCompletionIndex(current, key, targets.length),
			);
		} else if (key === "accept") {
			// 決めると候補が消えるので、次の Tab で、次の欄へ移る。
			const entry = targets[activeIndex ?? 0];

			if (entry) {
				event.preventDefault();

				if (isComposingKey) {
					void selectWhileComposing(entry);
				} else {
					select(entry);
				}
			}
		} else if (key === "accept-selected" && activeIndex !== null) {
			// 選んでいないときの Enter は、フォームの送信のまま。
			const entry = targets[activeIndex];

			if (entry) {
				event.preventDefault();
				select(entry);
			}
		}
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
				aria-controls={isPopup && isExpanded ? listboxId : undefined}
				aria-autocomplete="list"
				aria-activedescendant={
					isExpanded && activeIndex !== null
						? `${listboxId}-${activeIndex}`
						: undefined
				}
				onChange={(event) => {
					// 変換中の入力の直前に出ていた候補を覚える（Safari の Tab のため）。
					if (isComposing) {
						previousRef.current = isExpanded
							? { suggestions, at: performance.now() }
							: null;
					}

					onChange(event.target.value);
					setIsOpen(true);
					setActiveIndex(null);
				}}
				onCompositionStart={() => setIsComposing(true)}
				onCompositionEnd={() => setIsComposing(false)}
				onFocus={() => setIsOpen(true)}
				onBlur={() => {
					setIsOpen(false);
					setActiveIndex(null);
				}}
				onKeyDown={handleKeyDown}
			/>

			{isVisible && layout === "keyboard-bar" ? (
				<CompletionMenu
					textareaRef={inputRef}
					layout="keyboard-bar"
					open
					caret={0}
					items={suggestions.map((suggestion) => ({
						key: suggestion.key,
						label: suggestion.name,
						badge: badgeOf(suggestion),
					}))}
					activeIndex={activeIndex}
					onAccept={(index) => {
						const entry = suggestions[index];

						if (entry) {
							select(entry);
						}
					}}
				/>
			) : null}

			{isPopup && typeof document !== "undefined"
				? createPortal(
						<div
							className={styles.popup}
							ref={popupRef}
							style={{
								top: position?.top ?? 0,
								left: position?.left ?? 0,
								width: position?.width,
								maxHeight: position?.maxHeight ?? maxListHeight,
								visibility:
									position && !position.isHidden ? "visible" : "hidden",
							}}
						>
							<div
								className={styles.list}
								role="listbox"
								id={listboxId}
								ref={listRef}
							>
								{suggestions.map((entry, index) => {
									const note = badgeOf(entry);

									return (
										<button
											className={popupItem}
											type="button"
											role="option"
											tabIndex={-1}
											id={`${listboxId}-${index}`}
											aria-selected={index === activeIndex}
											key={entry.key}
											// 入力欄からフォーカスを外さずに選べるようにする。
											onMouseDown={(event) => event.preventDefault()}
											onClick={() => select(entry)}
										>
											<span className={styles.label}>{entry.name}</span>
											{note ? <span className={badge}>{note}</span> : null}
										</button>
									);
								})}
							</div>
							{hint ? <p className={popupHint}>{hint}</p> : null}
						</div>,
						document.body,
					)
				: null}
		</div>
	);
}
