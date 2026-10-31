import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { TextInput } from "../field/field";
import { Icon } from "../icon/icon";
import { IconButton } from "../icon-button/icon-button";
import { Sheet } from "../sheet/sheet";
import { useMediaQuery } from "../use-media-query";
import { formatDisplayDate, parseTypedDate } from "./calendar";
import { CalendarPanel } from "./calendar-panel";
import * as styles from "./date-picker.css";

type DateFieldProps = {
	// YYYY-MM-DD。日付がないときは、空。
	value: string;
	onChange: (value: string) => void;
	// 今日（YYYY-MM-DD）。カレンダーの「今日」と、年を省いて打った日付の年に使う。
	today: string;
	// 読み上げる名前（ラベルと結ぶときは、省略して id を使う）。
	"aria-label"?: string;
	id?: string;
	"aria-describedby"?: string;
	disabled?: boolean;
	placeholder?: string;
};

const POPOVER_WIDTH = 336;
const POPOVER_HEIGHT = 420;
const GAP = 6;
const EDGE = 12;

// 日付の欄。PC：打って入れられる欄と、カレンダー（ポップオーバー）。スマホ：欄を押すと、下のシートのカレンダー。
// 日付は、YYYY-MM-DD の文字で受け渡す。
export function DateField({
	value,
	onChange,
	today,
	disabled,
	placeholder,
	...aria
}: DateFieldProps) {
	const isCompact = useMediaQuery("(max-width: 767px)");

	return isCompact ? (
		<CompactDateField
			value={value}
			onChange={onChange}
			today={today}
			disabled={disabled}
			placeholder={placeholder}
			{...aria}
		/>
	) : (
		<DesktopDateField
			value={value}
			onChange={onChange}
			today={today}
			disabled={disabled}
			placeholder={placeholder}
			{...aria}
		/>
	);
}

// スマホ：押すとシートが開く欄（キーボードは出さない）。
function CompactDateField({
	value,
	onChange,
	today,
	disabled,
	placeholder = "日付を選ぶ",
	...aria
}: DateFieldProps) {
	const [isOpen, setIsOpen] = useState(false);
	const triggerRef = useRef<HTMLButtonElement>(null);

	function choose(next: string) {
		onChange(next);
		setIsOpen(false);
		triggerRef.current?.focus();
	}

	return (
		<>
			<button
				ref={triggerRef}
				className={styles.trigger}
				type="button"
				id={aria.id}
				aria-label={aria["aria-label"]}
				aria-describedby={aria["aria-describedby"]}
				aria-haspopup="dialog"
				disabled={disabled}
				data-empty={value === "" || undefined}
				onClick={() => setIsOpen(true)}
			>
				<span>{value === "" ? placeholder : formatDisplayDate(value)}</span>
				<Icon name="calendar" size={20} />
			</button>

			<Sheet
				open={isOpen}
				onOpenChange={(open) => {
					if (!open) {
						setIsOpen(false);
						triggerRef.current?.focus();
					}
				}}
				title="日付を選ぶ"
				snapPoints={[0.72]}
			>
				<CalendarPanel
					value={value}
					today={today}
					onSelect={choose}
					onClear={() => choose("")}
				/>
			</Sheet>
		</>
	);
}

// PC：打って入れられる欄（2026/11/2、11/2 など）と、カレンダーのボタン。
function DesktopDateField({
	value,
	onChange,
	today,
	disabled,
	placeholder = "2026/11/02",
	...aria
}: DateFieldProps) {
	const [text, setText] = useState(formatDisplayDate(value));
	const [isInvalid, setIsInvalid] = useState(false);
	const [anchor, setAnchor] = useState<DOMRect | null>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const errorId = useId();

	// 外から値が変わったとき（カレンダーで選んだ・消した・別の操作）は、欄の文字を合わせる。
	useEffect(() => {
		setText(formatDisplayDate(value));
		setIsInvalid(false);
	}, [value]);

	// 打った文字を、日付にして確定する。空は、日付なし。読めないときは、直すまで、赤く示す。
	function commit() {
		const trimmed = text.trim();

		if (trimmed === "") {
			setIsInvalid(false);

			if (value !== "") {
				onChange("");
			}

			return;
		}

		const parsed = parseTypedDate(trimmed, today);

		if (parsed === null) {
			setIsInvalid(true);

			return;
		}

		setIsInvalid(false);
		setText(formatDisplayDate(parsed));

		if (parsed !== value) {
			onChange(parsed);
		}
	}

	function openCalendar() {
		const wrapper = wrapperRef.current;

		if (wrapper && !disabled) {
			setAnchor(wrapper.getBoundingClientRect());
		}
	}

	const closeCalendar = useCallback((restoreFocus: boolean) => {
		setAnchor(null);

		if (restoreFocus) {
			inputRef.current?.focus();
		}
	}, []);

	function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (event.nativeEvent.isComposing) {
			return;
		}

		if (event.key === "Enter") {
			// 欄の中の Enter は、フォームを送らず、日付を確定する。
			event.preventDefault();
			commit();
		} else if (
			event.key === "ArrowDown" ||
			(event.altKey && event.key === "ArrowUp")
		) {
			event.preventDefault();
			openCalendar();
		}
	}

	return (
		<>
			<div className={styles.field} ref={wrapperRef}>
				<div className={styles.fieldInput}>
					<TextInput
						ref={inputRef}
						id={aria.id}
						aria-label={aria["aria-label"]}
						aria-describedby={
							isInvalid
								? `${errorId} ${aria["aria-describedby"] ?? ""}`.trim()
								: aria["aria-describedby"]
						}
						aria-invalid={isInvalid ? true : undefined}
						inputMode="numeric"
						autoComplete="off"
						placeholder={placeholder}
						value={text}
						disabled={disabled}
						onChange={(event) => setText(event.target.value)}
						onBlur={commit}
						onKeyDown={handleKeyDown}
					/>
				</div>

				<span className={styles.fieldButton}>
					<IconButton
						icon="calendar"
						label="カレンダーを開く"
						size="std"
						tone="plain"
						disabled={disabled}
						onClick={openCalendar}
					/>
				</span>
			</div>

			{isInvalid ? (
				<p className={styles.errorText} id={errorId} role="alert">
					日付を確認してください（例：2026/11/2）
				</p>
			) : null}

			{anchor ? (
				<CalendarPopover
					anchor={anchor}
					wrapper={wrapperRef}
					value={value}
					today={today}
					onSelect={(next) => {
						onChange(next);
						closeCalendar(true);
					}}
					onClear={() => {
						onChange("");
						closeCalendar(true);
					}}
					onClose={closeCalendar}
				/>
			) : null}
		</>
	);
}

type CalendarPopoverProps = {
	anchor: DOMRect;
	wrapper: { current: HTMLDivElement | null };
	value: string;
	today: string;
	onSelect: (date: string) => void;
	onClear: () => void;
	onClose: (restoreFocus: boolean) => void;
};

// 欄の下（入り切らなければ、上）に出す、カレンダーのポップオーバー。外を押す・スクロール・Esc で閉じる。
function CalendarPopover({
	anchor,
	wrapper,
	value,
	today,
	onSelect,
	onClear,
	onClose,
}: CalendarPopoverProps) {
	const ref = useRef<HTMLDivElement>(null);

	const below = window.innerHeight - anchor.bottom - EDGE - GAP;
	const above = anchor.top - EDGE - GAP;
	const placeBelow = below >= POPOVER_HEIGHT || below >= above;
	const left = Math.min(
		Math.max(EDGE, anchor.left),
		window.innerWidth - POPOVER_WIDTH - EDGE,
	);
	// 入り切らないときは、空いている側に出して、中をスクロールできるようにする（画面の外へ、はみ出さない）。
	const maxHeight = Math.max(0, placeBelow ? below : above);
	const style = placeBelow
		? { top: anchor.bottom + GAP, left, width: POPOVER_WIDTH, maxHeight }
		: {
				bottom: window.innerHeight - anchor.top + GAP,
				left,
				width: POPOVER_WIDTH,
				maxHeight,
			};

	useEffect(() => {
		function handlePointerDown(event: PointerEvent) {
			const target = event.target;

			if (!(target instanceof Node)) {
				return;
			}

			if (ref.current?.contains(target) || wrapper.current?.contains(target)) {
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
	}, [wrapper, onClose]);

	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key === "Escape") {
			event.preventDefault();
			event.stopPropagation();
			onClose(true);
		}
	}

	return createPortal(
		<div
			className={styles.popover}
			ref={ref}
			role="dialog"
			aria-label="カレンダー"
			style={style}
			onKeyDown={handleKeyDown}
		>
			<CalendarPanel
				value={value}
				today={today}
				onSelect={onSelect}
				onClear={onClear}
			/>
		</div>,
		document.body,
	);
}
