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
import { CompletionMenu } from "#/components/completion-menu/completion-menu";
import { placePopup } from "#/components/completion-menu/place-popup";
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
	const [position, setPosition] = useState<ListPosition | null>(null);
	// スクロール・画面の大きさの変化で、測り直す合図。
	const [, setLayoutTick] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
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
		const list = listRef.current;

		if (!isPopup || !input || !list) {
			setPosition((current) => (current === null ? current : null));

			return;
		}

		const box = input.getBoundingClientRect();
		const viewport = { width: window.innerWidth, height: window.innerHeight };
		const capHeight = Math.min(maxListHeight, viewport.height * 0.4);
		// 縮めているときも、本来の高さで決める（隠れている中身の高さを足す）。
		const height = Math.min(
			list.offsetHeight + Math.max(0, list.scrollHeight - list.clientHeight),
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
							className={styles.list}
							role="listbox"
							id={listboxId}
							ref={listRef}
							style={{
								top: position?.top ?? 0,
								left: position?.left ?? 0,
								width: position?.width,
								maxHeight: position?.maxHeight ?? maxListHeight,
								visibility:
									position && !position.isHidden ? "visible" : "hidden",
							}}
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
										{entry.name.startsWith(value.trim()) &&
										value.trim() !== "" ? (
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
						</div>,
						document.body,
					)
				: null}
		</div>
	);
}
