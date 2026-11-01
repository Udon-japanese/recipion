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
} from "#/components/completion-menu/completion-menu.css";
import { placePopup } from "#/components/completion-menu/place-popup";
import { useCompletionLayout } from "#/components/completion-menu/use-completion-layout";
import {
	type CompositionStrategy,
	chooseCompositionStrategy,
} from "#/ime/choose-composition-strategy";
import { endComposition, restoreFocus } from "#/ime/end-composition";
import { readBrowserEnvironment } from "#/ime/read-browser-environment";
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
	// 変換中の補完の方式（なければ、ブラウザから判定する）。テストで指定する。
	compositionStrategy?: CompositionStrategy;
};

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
// Safari で、IME の変換と Tab のキーのイベントが、続けて届くとみなす時間（ミリ秒）。
const previousSuggestionsWindowMs = 100;
// 入力欄と一覧のすき間、画面の端に残す余白。
const listGap = 6;
const viewportMargin = 8;

// 食材名の入力欄。入力に合わせて、食材カタログから候補を出す（在庫の登録と、買い物メモで共通）。
// 候補は、選ぶだけで入力に反映される。候補に出ない名前も、そのまま入力できる。
// キー操作は、レシピの本文の補完とそろえる：↑↓ で選び、Tab（または、選んだあとの Enter）で決める。
// 変換中は、Alt（Option）+↑↓ で選び、Tab で決める（素の矢印と Enter は、IME に任せる）。
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
}: IngredientNameInputProps) {
	const listboxId = useId();
	const [isOpen, setIsOpen] = useState(false);
	const [activeIndex, setActiveIndex] = useState(-1);
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
	// サーバーと同じ初期値で描画し、ブラウザで判定する。
	const [detectedStrategy, setDetectedStrategy] = useState<CompositionStrategy>(
		"wait-for-confirmation",
	);
	const strategy = compositionStrategy ?? detectedStrategy;
	// 変換中の入力の直前に出ていた候補。Safari は、Tab の前に IME が変換して入力が変わってから、キーのイベントが届くので、そのときに使う。
	const previousRef = useRef<{
		suggestions: IngredientCatalogEntry[];
		at: number;
	} | null>(null);
	// 変換中に候補を決める処理の最中（変換を確定させるのを待っている間）。
	const isAcceptingRef = useRef(false);

	useEffect(() => {
		setDetectedStrategy(chooseCompositionStrategy(readBrowserEnvironment()));
	}, []);

	const suggestions = useMemo(() => searchIngredientCatalog(value), [value]);

	// 入力がカタログの名前と完全に一致しているときは、確定済みとみなして、候補を出さない。
	// ただし、変換中は出す（変換が終わる前に、候補から選べるように）。
	const isVisible =
		isOpen &&
		suggestions.length > 0 &&
		(isComposing || findIngredientCatalogEntry(value) === undefined);

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

	function select(entry: IngredientCatalogEntry) {
		onChange(entry.name);
		onSelectEntry?.(entry);
		setIsOpen(false);
		setActiveIndex(-1);
	}

	// 変換中に、候補を決める。Chromium 系は、変換を確定させてから置き換え、フォーカスを戻す。
	// Safari・Android は、変換中のまま置き換える（ブラウザが変換を取り消す）。
	async function selectWhileComposing(entry: IngredientCatalogEntry) {
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

	// 変換中のキー操作。Tab で決め、Alt（Option）+↑↓ で選ぶ。ほかは IME に任せる。
	function handleComposingKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		// 変換中に候補を出さない環境（iPhone・Firefox など）は、すべて IME に任せる。
		if (strategy === "wait-for-confirmation") {
			return;
		}

		// 今出ている候補。なければ、Safari の方式のときだけ、直前の入力（IME の変換）の前に出ていた候補。
		const previous = previousRef.current;
		const targets = isExpanded
			? suggestions
			: strategy === "replace-in-place" &&
					previous &&
					performance.now() - previous.at < previousSuggestionsWindowMs
				? previous.suggestions
				: [];

		if (targets.length === 0) {
			return;
		}

		// Windows は、1回のキーで、keydown が2回届く（1回目は key が Process、2回目が本物のキー）。1回だけ扱う。
		if (
			event.altKey &&
			!event.ctrlKey &&
			!event.metaKey &&
			!event.shiftKey &&
			(event.key === "ArrowDown" || event.key === "ArrowUp")
		) {
			event.preventDefault();

			const step = event.key === "ArrowDown" ? 1 : -1;

			setActiveIndex(
				(current) => (current + step + targets.length) % targets.length,
			);
		} else if (event.code === "Tab" && !event.shiftKey) {
			const entry = targets[Math.max(activeIndex, 0)];

			if (entry) {
				event.preventDefault();
				void selectWhileComposing(entry);
			}
		}
	}

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.nativeEvent.isComposing) {
			handleComposingKeyDown(event);

			return;
		}

		if (event.key === "Escape") {
			// 候補が出ているときは、シートごと閉じないよう、ここで止めて、候補だけ閉じる。
			if (isExpanded) {
				event.preventDefault();
				event.stopPropagation();
			}

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

		// 候補が出ているときの Tab は、決定（選んでいなければ、先頭）。決めると候補が消えるので、次の Tab で、次の欄へ移る。
		if (
			event.key === "Tab" &&
			!event.shiftKey &&
			!event.altKey &&
			!event.ctrlKey &&
			!event.metaKey &&
			isExpanded
		) {
			const entry = suggestions[Math.max(activeIndex, 0)];

			if (entry) {
				event.preventDefault();
				select(entry);
			}

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
					isExpanded && activeIndex >= 0
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
									const note = describeEntry?.(entry);

									return (
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
