import {
	type ComponentProps,
	forwardRef,
	type KeyboardEvent as ReactKeyboardEvent,
	type MouseEvent as ReactMouseEvent,
	type Ref,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "../icon/icon";
import { Sheet } from "../sheet/sheet";
import * as styles from "./picker-select.css";

type Choice = { value: string; label: string; disabled: boolean };

type Opened =
	| { kind: "popover"; rect: DOMRect }
	| { kind: "sheet"; snap: number };

// この幅より狭い画面（スマホ）では、ボトムシートで選ぶ。
const COMPACT_QUERY = "(max-width: 767px)";
const OPTION_HEIGHT = 46;
const POPOVER_MAX_HEIGHT = 320;
const GAP = 6;
const EDGE = 12;

function isCompact() {
	return (
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia(COMPACT_QUERY).matches
	);
}

function readChoices(select: HTMLSelectElement): Choice[] {
	return Array.from(select.options).map((option) => ({
		value: option.value,
		label: option.text,
		disabled: option.disabled,
	}));
}

function labelOf(select: HTMLSelectElement) {
	return (
		select.labels?.[0]?.textContent?.replace(/任意$/, "").trim() ||
		select.getAttribute("aria-label") ||
		"選ぶ"
	);
}

function setRef<T>(ref: Ref<T> | undefined, value: T | null) {
	if (typeof ref === "function") {
		ref(value);
	} else if (ref) {
		ref.current = value;
	}
}

type PickerSelectProps = Omit<ComponentProps<"select">, "ref">;

// 本物の <select> はそのまま残し（ラベル・フォーム・読み上げ・テストは、これまでどおり）、
// 開くときだけ、標準の一覧の代わりに、PC は一覧（ドロップダウン）、スマホはボトムシートを出す。
// 選ぶと、<select> の値を書き換えて change を送るので、呼び出し側は onChange のまま使える。
export const PickerSelect = forwardRef<HTMLSelectElement, PickerSelectProps>(
	function PickerSelect(props, forwardedRef) {
		const { onClick, onMouseDown, onKeyDown, ...rest } = props;
		const selectRef = useRef<HTMLSelectElement | null>(null);
		const [opened, setOpened] = useState<Opened | null>(null);
		const [choices, setChoices] = useState<Choice[]>([]);
		const [title, setTitle] = useState("");
		const [selectedValue, setSelectedValue] = useState("");

		const close = useCallback((restoreFocus: boolean) => {
			setOpened(null);
			if (restoreFocus) {
				selectRef.current?.focus();
			}
		}, []);

		const open = useCallback(() => {
			const select = selectRef.current;
			if (!select || select.disabled) {
				return;
			}
			const list = readChoices(select);
			setChoices(list);
			setTitle(labelOf(select));
			setSelectedValue(select.value);

			if (isCompact()) {
				const wanted = (list.length * OPTION_HEIGHT + 120) / window.innerHeight;
				setOpened({
					kind: "sheet",
					snap: Math.min(0.92, Math.max(0.3, wanted)),
				});
			} else {
				setOpened({ kind: "popover", rect: select.getBoundingClientRect() });
			}
		}, []);

		// 外から値が変わったら（別の操作・テスト）、一覧を閉じる。
		useEffect(() => {
			const select = selectRef.current;
			if (!opened || !select) {
				return;
			}
			const handleChange = () => setOpened(null);
			select.addEventListener("change", handleChange);
			return () => select.removeEventListener("change", handleChange);
		}, [opened]);

		function choose(value: string) {
			const select = selectRef.current;
			setOpened(null);
			if (!select) {
				return;
			}
			select.focus();
			if (value !== select.value) {
				select.value = value;
				select.dispatchEvent(new Event("change", { bubbles: true }));
			}
		}

		function handleMouseDown(event: ReactMouseEvent<HTMLSelectElement>) {
			onMouseDown?.(event);
			if (event.defaultPrevented || event.currentTarget.disabled) {
				return;
			}
			// 標準の一覧を出さない。フォーカスは自分で移す。
			event.preventDefault();
			event.currentTarget.focus();
		}

		function handleClick(event: ReactMouseEvent<HTMLSelectElement>) {
			onClick?.(event);
			if (event.defaultPrevented || event.currentTarget.disabled) {
				return;
			}
			event.preventDefault();
			open();
		}

		function handleKeyDown(event: ReactKeyboardEvent<HTMLSelectElement>) {
			onKeyDown?.(event);
			if (event.defaultPrevented) {
				return;
			}
			const opensWithAlt =
				event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp");
			if (
				event.key === "Enter" ||
				event.key === " " ||
				event.key === "F4" ||
				opensWithAlt
			) {
				event.preventDefault();
				open();
			}
		}

		return (
			<>
				<select
					{...rest}
					ref={(element) => {
						selectRef.current = element;
						setRef(forwardedRef, element);
					}}
					onMouseDown={handleMouseDown}
					onClick={handleClick}
					onKeyDown={handleKeyDown}
				/>
				{opened?.kind === "popover" ? (
					<Popover
						rect={opened.rect}
						choices={choices}
						selectedValue={selectedValue}
						onChoose={choose}
						onClose={close}
						anchor={selectRef}
					/>
				) : null}
				{opened?.kind === "sheet" ? (
					<Sheet
						open
						onOpenChange={(next) => {
							if (!next) {
								close(true);
							}
						}}
						title={title}
						snapPoints={[opened.snap]}
					>
						<OptionList
							choices={choices}
							selectedValue={selectedValue}
							onChoose={choose}
						/>
					</Sheet>
				) : null}
			</>
		);
	},
);

type OptionListProps = {
	choices: Choice[];
	selectedValue: string;
	onChoose: (value: string) => void;
};

function OptionList({ choices, selectedValue, onChoose }: OptionListProps) {
	return (
		<div className={styles.list}>
			{choices.map((choice) => {
				const isSelected = choice.value === selectedValue;
				return (
					<button
						key={choice.value}
						type="button"
						className={styles.option}
						aria-current={isSelected ? "true" : undefined}
						disabled={choice.disabled}
						data-selected={isSelected || undefined}
						onClick={() => onChoose(choice.value)}
					>
						<span>{choice.label}</span>
						{isSelected ? (
							<span className={styles.check}>
								<Icon name="check" size={20} />
							</span>
						) : null}
					</button>
				);
			})}
		</div>
	);
}

type PopoverProps = OptionListProps & {
	rect: DOMRect;
	anchor: { current: HTMLSelectElement | null };
	onClose: (restoreFocus: boolean) => void;
};

function Popover({
	rect,
	choices,
	selectedValue,
	onChoose,
	onClose,
	anchor,
}: PopoverProps) {
	const ref = useRef<HTMLDivElement>(null);

	const wanted = Math.min(
		POPOVER_MAX_HEIGHT,
		choices.length * (OPTION_HEIGHT + 2) + 12,
	);
	const below = window.innerHeight - rect.bottom - EDGE - GAP;
	const above = rect.top - EDGE - GAP;
	const placeBelow = below >= wanted || below >= above;
	const maxHeight = Math.max(120, Math.min(wanted, placeBelow ? below : above));
	const width = Math.max(rect.width, 200);
	const left = Math.min(
		Math.max(EDGE, rect.left),
		window.innerWidth - width - EDGE,
	);

	// 開いたら、選ばれている項目（なければ最初）にフォーカスを移す。
	useEffect(() => {
		const root = ref.current;
		if (!root) {
			return;
		}
		const target =
			root.querySelector<HTMLButtonElement>('[aria-current="true"]') ??
			root.querySelector<HTMLButtonElement>("button:not(:disabled)");
		target?.focus();
		target?.scrollIntoView?.({ block: "nearest" });
	}, []);

	// 外を押す・画面の大きさやスクロールが変わる、で閉じる。
	useEffect(() => {
		function handlePointerDown(event: PointerEvent) {
			const target = event.target;
			if (!(target instanceof Node)) {
				return;
			}
			if (ref.current?.contains(target) || anchor.current?.contains(target)) {
				return;
			}
			onClose(false);
		}
		function handleScroll(event: Event) {
			if (event.target instanceof Node && ref.current?.contains(event.target)) {
				return;
			}
			onClose(false);
		}
		function handleResize() {
			onClose(false);
		}
		document.addEventListener("pointerdown", handlePointerDown, true);
		window.addEventListener("scroll", handleScroll, true);
		window.addEventListener("resize", handleResize);
		return () => {
			document.removeEventListener("pointerdown", handlePointerDown, true);
			window.removeEventListener("scroll", handleScroll, true);
			window.removeEventListener("resize", handleResize);
		};
	}, [anchor, onClose]);

	function handleKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
		const root = ref.current;
		if (!root) {
			return;
		}
		if (event.key === "Escape") {
			event.preventDefault();
			onClose(true);
			return;
		}
		if (event.key === "Tab") {
			onClose(true);
			return;
		}
		const items = Array.from(
			root.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"),
		);
		const index = items.indexOf(document.activeElement as HTMLButtonElement);
		let next = -1;
		if (event.key === "ArrowDown") {
			next = Math.min(items.length - 1, index + 1);
		} else if (event.key === "ArrowUp") {
			next = Math.max(0, index - 1);
		} else if (event.key === "Home") {
			next = 0;
		} else if (event.key === "End") {
			next = items.length - 1;
		}
		if (next >= 0) {
			event.preventDefault();
			items[next]?.focus();
		}
	}

	return createPortal(
		// biome-ignore lint/a11y/noStaticElementInteractions: 一覧のキー操作（矢印・Esc）を受ける外枠。
		<div
			ref={ref}
			className={styles.popover}
			style={{
				left,
				width,
				maxHeight,
				...(placeBelow
					? { top: rect.bottom + GAP }
					: { bottom: window.innerHeight - rect.top + GAP }),
			}}
			onKeyDown={handleKeyDown}
		>
			<OptionList
				choices={choices}
				selectedValue={selectedValue}
				onChoose={onChoose}
			/>
		</div>,
		document.body,
	);
}
