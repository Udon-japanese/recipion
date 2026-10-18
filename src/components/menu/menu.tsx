import {
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useId,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "../icon/icon";
import type { IconName } from "../icon/icon-definitions";
import { IconButton } from "../icon-button/icon-button";
import type { MenuItemTone } from "./menu.css";
import * as styles from "./menu.css";

export type MenuItem = {
	label: string;
	icon?: IconName;
	tone?: MenuItemTone;
	disabled?: boolean;
	onSelect: () => void;
};

type MenuProps = {
	// 開くボタンの読み上げる名前（例：「トマトのその他」）。
	label: string;
	icon: IconName;
	items: readonly MenuItem[];
	disabled?: boolean;
	// 開くボタンの代わりに出すもの（省略すると、アイコンボタン）。
	trigger?: (props: {
		ref: (element: HTMLButtonElement | null) => void;
		onClick: () => void;
		"aria-haspopup": "menu";
		"aria-expanded": boolean;
		"aria-controls": string | undefined;
	}) => ReactNode;
};

const WIDTH = 216;
const ITEM_HEIGHT = 48;
const GAP = 6;
const EDGE = 12;

// ボタンの右端にそろえ、画面の端に収まる位置に置く。下に入らなければ、上に出す。
function placeMenu(
	anchor: { right: number; top: number; bottom: number },
	size: { width: number; height: number },
) {
	const left = Math.min(
		Math.max(EDGE, anchor.right - size.width),
		window.innerWidth - size.width - EDGE,
	);
	const below = anchor.bottom + GAP;
	const top =
		below + size.height > window.innerHeight - EDGE
			? Math.max(EDGE, anchor.top - GAP - size.height)
			: below;

	return { left, top };
}

// 押すと出る、短い操作の一覧（行の「その他」・並べ替え など）。
// 矢印で選び、Esc で閉じてボタンへ戻る。外を押す・Tab でも閉じる。
export function Menu({ label, icon, items, disabled, trigger }: MenuProps) {
	const menuId = useId();
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const popupRef = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState<{
		left: number;
		top: number;
	} | null>(null);
	// 開くボタンの位置（メニューの大きさが分かったあとに、置き直すため）。
	const anchorRef = useRef<{
		right: number;
		top: number;
		bottom: number;
	} | null>(null);

	function open() {
		const trigger = triggerRef.current;

		if (!trigger) {
			return;
		}

		const rect = trigger.getBoundingClientRect();

		anchorRef.current = {
			right: rect.right,
			top: rect.top,
			bottom: rect.bottom,
		};

		// 大きさは、まだ分からないので、仮の値で置く（直後に、実際の大きさで置き直す）。
		const placed = placeMenu(anchorRef.current, {
			width: WIDTH,
			height: items.length * ITEM_HEIGHT + 8,
		});

		setPosition(placed);
	}

	function close(returnFocus: boolean) {
		setPosition(null);

		if (returnFocus) {
			triggerRef.current?.focus();
		}
	}

	const isOpen = position !== null;

	// 内容の幅に合わせて広がるので、実際の大きさが分かったら、右端をボタンにそろえて置き直す。
	useLayoutEffect(() => {
		const popup = popupRef.current;
		const anchor = anchorRef.current;

		if (!isOpen || !popup || !anchor) {
			return;
		}

		const placed = placeMenu(anchor, {
			width: popup.offsetWidth,
			height: popup.offsetHeight,
		});

		setPosition((current) =>
			current && current.left === placed.left && current.top === placed.top
				? current
				: placed,
		);
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		popupRef.current
			?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled])')
			?.focus();

		function handlePointerDown(event: PointerEvent) {
			const target = event.target as Node;

			if (
				!popupRef.current?.contains(target) &&
				!triggerRef.current?.contains(target)
			) {
				setPosition(null);
			}
		}

		function handleScroll() {
			setPosition(null);
		}

		document.addEventListener("pointerdown", handlePointerDown, true);
		window.addEventListener("scroll", handleScroll, true);
		window.addEventListener("resize", handleScroll);

		return () => {
			document.removeEventListener("pointerdown", handlePointerDown, true);
			window.removeEventListener("scroll", handleScroll, true);
			window.removeEventListener("resize", handleScroll);
		};
	}, [isOpen]);

	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key === "Escape") {
			event.preventDefault();
			event.stopPropagation();
			close(true);

			return;
		}

		if (event.key === "Tab") {
			close(false);

			return;
		}

		const enabled = Array.from(
			popupRef.current?.querySelectorAll<HTMLElement>(
				'[role="menuitem"]:not([aria-disabled])',
			) ?? [],
		);
		const index = enabled.indexOf(document.activeElement as HTMLElement);

		if (event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();

			const step = event.key === "ArrowDown" ? 1 : -1;

			enabled[(index + step + enabled.length) % enabled.length]?.focus();
		} else if (event.key === "Home" || event.key === "End") {
			event.preventDefault();
			enabled[event.key === "Home" ? 0 : enabled.length - 1]?.focus();
		}
	}

	const triggerProps = {
		ref: (element: HTMLButtonElement | null) => {
			triggerRef.current = element;
		},
		onClick: () => (isOpen ? close(false) : open()),
		"aria-haspopup": "menu" as const,
		"aria-expanded": isOpen,
		"aria-controls": isOpen ? menuId : undefined,
	};

	return (
		<>
			{trigger ? (
				trigger(triggerProps)
			) : (
				<IconButton
					{...triggerProps}
					icon={icon}
					label={label}
					tone="plain"
					disabled={disabled}
				/>
			)}

			{isOpen && position && typeof document !== "undefined"
				? createPortal(
						<div
							className={styles.popup}
							id={menuId}
							role="menu"
							aria-label={label}
							ref={popupRef}
							style={{ left: position.left, top: position.top }}
							onKeyDown={handleKeyDown}
						>
							{items.map((entry) => (
								<button
									className={styles.item({ tone: entry.tone })}
									type="button"
									role="menuitem"
									key={entry.label}
									aria-disabled={entry.disabled || undefined}
									onClick={() => {
										if (entry.disabled) {
											return;
										}

										close(true);
										entry.onSelect();
									}}
								>
									{entry.icon ? <Icon name={entry.icon} size={20} /> : null}
									{entry.label}
								</button>
							))}
						</div>,
						document.body,
					)
				: null}
		</>
	);
}
