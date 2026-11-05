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
import { useCloseOnBack } from "../sheet/use-close-on-back";
import type { MenuItemTone } from "./menu.css";
import * as styles from "./menu.css";

// 選ぶと実行する項目。checked があれば、選択肢の1つ（チェックの印を出す。下の階層の選択肢で使う）。
export type MenuActionItem = {
	label: string;
	icon?: IconName;
	tone?: MenuItemTone;
	disabled?: boolean;
	checked?: boolean;
	onSelect: () => void;
};

// 選ぶと、同じ枠の中身が、下の階層（見出し・戻る・選択肢）に替わる項目。detail は、いまの値（右に薄く出す）。
export type MenuSubmenuItem = {
	label: string;
	icon?: IconName;
	detail?: string;
	submenu: {
		title: string;
		items: readonly MenuActionItem[];
	};
};

export type MenuItem = MenuActionItem | MenuSubmenuItem;

function isSubmenuItem(item: MenuItem): item is MenuSubmenuItem {
	return "submenu" in item;
}

// 矢印で動ける項目（選べないものは除く）。
const focusableItemSelector = '[role^="menuitem"]:not([aria-disabled])';

type MenuProps = {
	// 開くボタンの読み上げる名前（例：「トマトのその他」）。
	label: string;
	icon: IconName;
	items: readonly MenuItem[];
	disabled?: boolean;
	// 出す向きの希望（入らなければ、反対側）。画面の下の隅にあるボタンは、above。
	placement?: "below" | "above";
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

// ボタンの右端にそろえ、画面の端に収まる位置に置く。下に入らなければ、上に出す（prefer が above なら、逆）。
function placeMenu(
	anchor: { right: number; top: number; bottom: number },
	size: { width: number; height: number },
	prefer: "below" | "above",
) {
	const left = Math.min(
		Math.max(EDGE, anchor.right - size.width),
		window.innerWidth - size.width - EDGE,
	);
	const below = anchor.bottom + GAP;
	const above = anchor.top - GAP - size.height;
	const fitsBelow = below + size.height <= window.innerHeight - EDGE;
	const fitsAbove = above >= EDGE;
	const useAbove = prefer === "above" ? fitsAbove || !fitsBelow : !fitsBelow;

	return { left, top: useAbove ? Math.max(EDGE, above) : below };
}

// 押すと出る、短い操作の一覧（行の「その他」・並べ替え など）。
// 矢印で選び、Esc で閉じてボタンへ戻る。外を押す・Tab でも閉じる。
export function Menu({
	label,
	icon,
	items,
	disabled,
	placement = "below",
	trigger,
}: MenuProps) {
	const menuId = useId();
	const triggerRef = useRef<HTMLButtonElement | null>(null);
	const popupRef = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState<{
		left: number;
		top: number;
	} | null>(null);
	// 開いている下の階層（items の中の位置）。null は、いちばん上の階層。
	const [submenuIndex, setSubmenuIndex] = useState<number | null>(null);
	const openedSubmenu =
		submenuIndex === null ? null : (items[submenuIndex] ?? null);
	const submenu =
		openedSubmenu && isSubmenuItem(openedSubmenu) ? openedSubmenu : null;
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
		const placed = placeMenu(
			anchorRef.current,
			{
				width: WIDTH,
				height: items.length * ITEM_HEIGHT + 8,
			},
			placement,
		);

		setSubmenuIndex(null);
		setPosition(placed);
	}

	function close(returnFocus: boolean) {
		setPosition(null);
		setSubmenuIndex(null);

		if (returnFocus) {
			triggerRef.current?.focus();
		}
	}

	const isOpen = position !== null;

	useCloseOnBack(isOpen, () => {
		setPosition(null);
		setSubmenuIndex(null);
	});

	// 内容の幅に合わせて広がるので、実際の大きさが分かったら、右端をボタンにそろえて置き直す。
	// biome-ignore lint/correctness/useExhaustiveDependencies: 階層を替えると（submenuIndex）大きさが変わるので、置き直す。
	useLayoutEffect(() => {
		const popup = popupRef.current;
		const anchor = anchorRef.current;

		if (!isOpen || !popup || !anchor) {
			return;
		}

		const placed = placeMenu(
			anchor,
			{
				width: popup.offsetWidth,
				height: popup.offsetHeight,
			},
			placement,
		);

		setPosition((current) =>
			current && current.left === placed.left && current.top === placed.top
				? current
				: placed,
		);
	}, [isOpen, placement, submenuIndex]);

	// 開いたとき・階層を替えたとき、その階層の最初の選べる項目（下の階層は、選んでいる選択肢）へ。
	// biome-ignore lint/correctness/useExhaustiveDependencies: 階層を替えたとき（submenuIndex）にも、フォーカスを移す。
	useEffect(() => {
		if (!isOpen) {
			return;
		}

		const popup = popupRef.current;

		(
			popup?.querySelector<HTMLElement>('[aria-checked="true"]') ??
			popup?.querySelector<HTMLElement>(focusableItemSelector)
		)?.focus();
	}, [isOpen, submenuIndex]);

	useEffect(() => {
		if (!isOpen) {
			return;
		}

		function handlePointerDown(event: PointerEvent) {
			const target = event.target as Node;

			if (
				!popupRef.current?.contains(target) &&
				!triggerRef.current?.contains(target)
			) {
				setPosition(null);
				setSubmenuIndex(null);
			}
		}

		function handleScroll() {
			setPosition(null);
			setSubmenuIndex(null);
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
		// 下の階層では、Esc と ← で、上の階層へ戻る。
		if (submenu && (event.key === "Escape" || event.key === "ArrowLeft")) {
			event.preventDefault();
			event.stopPropagation();
			setSubmenuIndex(null);

			return;
		}

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
			popupRef.current?.querySelectorAll<HTMLElement>(focusableItemSelector) ??
				[],
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
							{submenu ? (
								<>
									<div className={styles.submenuHeader}>
										<IconButton
											icon="chevron-left"
											label="戻る"
											tone="plain"
											onClick={() => setSubmenuIndex(null)}
										/>
										<span className={styles.submenuTitle}>
											{submenu.submenu.title}
										</span>
									</div>
									{submenu.submenu.items.map((entry) => (
										<ActionItemButton
											key={entry.label}
											entry={entry}
											onDone={() => close(true)}
										/>
									))}
								</>
							) : (
								items.map((entry, index) =>
									isSubmenuItem(entry) ? (
										<button
											className={styles.item({})}
											type="button"
											role="menuitem"
											aria-haspopup="menu"
											key={entry.label}
											onClick={() => setSubmenuIndex(index)}
											onKeyDown={(event) => {
												if (event.key === "ArrowRight") {
													event.preventDefault();
													setSubmenuIndex(index);
												}
											}}
										>
											{entry.icon ? <Icon name={entry.icon} size={20} /> : null}
											<span className={styles.itemLabel}>{entry.label}</span>
											{entry.detail ? (
												<span className={styles.itemDetail}>
													{entry.detail}
												</span>
											) : null}
											<Icon name="chevron-right" size={20} />
										</button>
									) : (
										<ActionItemButton
											key={entry.label}
											entry={entry}
											onDone={() => close(true)}
										/>
									),
								)
							)}
						</div>,
						document.body,
					)
				: null}
		</>
	);
}

// 選ぶと実行する項目（選択肢なら、チェックの印つき）。
function ActionItemButton({
	entry,
	onDone,
}: {
	entry: MenuActionItem;
	onDone: () => void;
}) {
	const handleClick = () => {
		if (entry.disabled) {
			return;
		}

		onDone();
		entry.onSelect();
	};

	if (entry.checked !== undefined) {
		return (
			<button
				className={styles.item({ tone: entry.tone })}
				type="button"
				role="menuitemradio"
				aria-checked={entry.checked}
				aria-disabled={entry.disabled || undefined}
				onClick={handleClick}
			>
				<span className={styles.checkSlot}>
					{entry.checked ? <Icon name="check" size={20} /> : null}
				</span>
				{entry.label}
			</button>
		);
	}

	return (
		<button
			className={styles.item({ tone: entry.tone })}
			type="button"
			role="menuitem"
			aria-disabled={entry.disabled || undefined}
			onClick={handleClick}
		>
			{entry.icon ? <Icon name={entry.icon} size={20} /> : null}
			{entry.label}
		</button>
	);
}
