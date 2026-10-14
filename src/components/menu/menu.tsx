import {
	type KeyboardEvent,
	type ReactNode,
	useEffect,
	useId,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "../icon/icon";
import type { IconName } from "../icon/icon-definitions";
import { IconButton } from "../icon-button/icon-button";
import * as styles from "./menu.css";

export type MenuItem = {
	label: string;
	icon?: IconName;
	tone?: "default" | "danger";
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

	function open() {
		const trigger = triggerRef.current;

		if (!trigger) {
			return;
		}

		const rect = trigger.getBoundingClientRect();
		const height = items.length * ITEM_HEIGHT + 8;
		const left = Math.min(
			Math.max(EDGE, rect.right - WIDTH),
			window.innerWidth - WIDTH - EDGE,
		);
		const below = rect.bottom + GAP;
		const top =
			below + height > window.innerHeight - EDGE
				? Math.max(EDGE, rect.top - GAP - height)
				: below;

		setPosition({ left, top });
	}

	function close(returnFocus: boolean) {
		setPosition(null);

		if (returnFocus) {
			triggerRef.current?.focus();
		}
	}

	const isOpen = position !== null;

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
									className={styles.item}
									type="button"
									role="menuitem"
									key={entry.label}
									data-tone={entry.tone}
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
