import {
	type ReactNode,
	type RefObject,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import * as styles from "./completion-menu.css";
import { measureTextareaCaret } from "./measure-textarea-caret";
import { placePopup, type Size } from "./place-popup";
import type { CompletionLayout } from "./use-completion-layout";

export type CompletionMenuItem = {
	key: string;
	label: string;
	// 候補の種類の印（例：「店」）。
	badge?: string;
};

type CompletionMenuProps = {
	// 1行の入力欄でも使える（その場合は、keyboard-bar だけ）。
	textareaRef: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
	layout: CompletionLayout;
	open: boolean;
	// カーソルの位置（本文の index）。メニューを、ここの近くに置く。
	caret: number;
	// 候補。null のときは、候補がない理由（notice）だけを出す。
	items: readonly CompletionMenuItem[] | null;
	activeIndex: number | null;
	// 候補を押した（入力欄のフォーカスを外さないよう、押した時点で呼ぶ）。
	onAccept: (index: number) => void;
	notice?: ReactNode;
	// PC のメニューの下に出す、操作の案内。
	hint?: ReactNode;
	// 先に置こうとする側。入らなければ、反対側に置く（変換中は、IME の窓を避けて上）。
	prefer?: "above" | "below";
	// PC のメニューの置き場所。caret：カーソルの近く（複数行の本文）。field：入力欄の上か下に、入力欄と同じ幅で（1行の入力欄）。
	anchor?: "caret" | "field";
	// 入力欄が combobox のとき（食材名の入力欄）：一覧を listbox にして、入力欄の aria-controls・aria-activedescendant から指せるようにする。
	listboxId?: string;
	// field で、上に出したいのに入らないとき、下に出さずに隠す（変換中。下に出すと、IME の窓に重なる）。
	hideBelow?: boolean;
	// PC のメニューが、見えるようになった・隠れたとき（hideBelow で隠すときを含む）。
	onShownChange?: (isShown: boolean) => void;
};

type Position = {
	top: number;
	left: number;
	maxHeight?: number;
	width?: number;
	// 上に出したいのに入らず、隠しているとき（hideBelow）。
	isHidden: boolean;
};

// 一覧と入力欄のすき間（field）。
const fieldGap = 6;

// 入力欄の補完の候補を出す共通の部品（レシピの本文・買い物メモの「まとめて追加」）。
// 見た目と位置合わせだけを受け持つ。キー操作（↑↓・Tab・Esc）、変換中の扱い、候補の作り方は、使う側が行う。
// - PC：カーソルの近くの縦のメニュー（入力中の行には重ねない）。
// - スマホ：キーボードのすぐ上の、横にスクロールできる帯。
export function CompletionMenu({
	textareaRef,
	layout,
	open,
	caret,
	items,
	activeIndex,
	onAccept,
	notice,
	hint,
	prefer = "below",
	anchor = "caret",
	listboxId,
	hideBelow = false,
	onShownChange,
}: CompletionMenuProps) {
	const popupRef = useRef<HTMLDivElement>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLUListElement>(null);
	const [position, setPosition] = useState<Position | null>(null);
	// 入力欄のスクロール・画面の大きさの変化で、測り直す合図。
	const [, setLayoutTick] = useState(0);
	// キーボードを除いた見える範囲の下端から、画面の下端までの高さ（キーボードの上に出す帯の位置）。
	const [barBottom, setBarBottom] = useState(0);

	useEffect(() => {
		if (!open) {
			return;
		}

		const textarea = textareaRef.current;
		const update = () => setLayoutTick((tick) => tick + 1);

		textarea?.addEventListener("scroll", update);
		window.addEventListener("resize", update);
		// シートの本文など、入力欄を囲む枠のスクロールでも、測り直す（scroll は泡立たないので、捕捉で受ける）。
		window.addEventListener("scroll", update, true);

		return () => {
			textarea?.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
			window.removeEventListener("scroll", update, true);
		};
	}, [open, textareaRef]);

	// カーソルの近くに出す位置を決める。毎回の描画のあとに測る（候補・本文・カーソルが変わると、大きさや位置が変わるため）。
	// 依存の配列は付けない（結果が同じなら、状態を更新しないので、繰り返さない）。
	useLayoutEffect(() => {
		const textarea = textareaRef.current;
		const popup = popupRef.current;

		if (!open || layout !== "caret" || !textarea || !popup) {
			setPosition((current) => (current === null ? current : null));

			return;
		}

		// 縮めているときも、本来の高さで決める（一覧の中身の高さを足す）。
		const popupHeight =
			popup.offsetHeight +
			(listRef.current
				? Math.max(
						0,
						listRef.current.scrollHeight - listRef.current.clientHeight,
					)
				: 0);
		const viewport = { width: window.innerWidth, height: window.innerHeight };
		let next: Position;

		if (anchor === "field") {
			const box = textarea.getBoundingClientRect();
			const placed = placePopup({
				caret: { top: box.top, left: box.left, height: box.height },
				popup: { width: box.width, height: popupHeight },
				viewport,
				prefer,
				gap: fieldGap,
			});

			next = {
				top: placed.top,
				left: placed.left,
				maxHeight: placed.maxHeight,
				width: box.width,
				isHidden: hideBelow && prefer === "above" && placed.side === "below",
			};
		} else if (textarea instanceof HTMLTextAreaElement) {
			next = placeAtCaret(
				textarea,
				{ width: popup.offsetWidth, height: popupHeight },
				viewport,
			);
		} else {
			setPosition((current) => (current === null ? current : null));

			return;
		}

		setPosition((current) =>
			current &&
			current.top === next.top &&
			current.left === next.left &&
			current.maxHeight === next.maxHeight &&
			current.width === next.width &&
			current.isHidden === next.isHidden
				? current
				: next,
		);
	});

	// カーソルの近く（複数行の本文）。
	function placeAtCaret(
		textarea: HTMLTextAreaElement,
		popup: Size,
		viewport: Size,
	): Position {
		const measured = measureTextareaCaret(textarea, caret);
		const box = textarea.getBoundingClientRect();
		// カーソルが、スクロールで入力欄の外に出ているときは、入力欄の端に寄せる。
		const caretTop = Math.min(
			Math.max(box.top + measured.top, box.top),
			box.bottom - measured.height,
		);
		const placed = placePopup({
			caret: {
				top: caretTop,
				left: box.left + measured.left,
				height: measured.height,
			},
			popup,
			viewport,
			prefer,
		});

		return {
			top: placed.top,
			left: placed.left,
			maxHeight: placed.maxHeight,
			isHidden: false,
		};
	}

	// キーボードのすぐ上に出す帯の位置。キーボードを除いた見える範囲（visualViewport）の下端に合わせる。
	useEffect(() => {
		if (!open || layout !== "keyboard-bar") {
			return;
		}

		const viewport = window.visualViewport;

		function update() {
			setBarBottom(
				viewport
					? Math.max(
							0,
							window.innerHeight - (viewport.height + viewport.offsetTop),
						)
					: 0,
			);
		}

		update();
		viewport?.addEventListener("resize", update);
		viewport?.addEventListener("scroll", update);

		return () => {
			viewport?.removeEventListener("resize", update);
			viewport?.removeEventListener("scroll", update);
		};
	}, [open, layout]);

	// 選んでいる候補が、一覧の見える範囲の外にあれば、見える位置までスクロールする。
	useEffect(() => {
		if (activeIndex === null) {
			return;
		}

		rootRef.current
			?.querySelector<HTMLElement>('[data-active="true"]')
			?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
	}, [activeIndex]);

	// PC のメニューが、いま見えているか（位置が決まり、隠していない）。スマホの帯は、開いていれば見える。
	const isShown =
		open &&
		(layout === "keyboard-bar" || (position !== null && !position.isHidden));
	const onShownChangeRef = useRef(onShownChange);

	onShownChangeRef.current = onShownChange;

	useEffect(() => {
		onShownChangeRef.current?.(isShown);
	}, [isShown]);

	if (!open || typeof document === "undefined") {
		return null;
	}

	const isPopup = layout === "caret";
	const list = items
		? items.map((item, index) => {
				const isActive = activeIndex === index;

				return (
					<li key={item.key} role={listboxId ? "none" : undefined}>
						<button
							type="button"
							className={isPopup ? styles.popupItem : styles.barItem}
							// Tab は、候補の決定に使う。ボタンへは移らない。
							tabIndex={-1}
							// 選んでいる候補：listbox なら aria-selected、そうでなければ aria-current。
							{...(listboxId
								? {
										role: "option",
										id: `${listboxId}-${index}`,
										"aria-selected": isActive,
									}
								: { "aria-current": isActive })}
							data-active={isActive}
							// 入力欄のフォーカスを外さないよう、押した時点で決定する。
							onMouseDown={(event) => {
								event.preventDefault();
								onAccept(index);
							}}
						>
							<span className={styles.itemLabel}>{item.label}</span>
							{item.badge ? (
								<span className={styles.badge}>{item.badge}</span>
							) : null}
						</button>
					</li>
				);
			})
		: null;
	const listProps = {
		"aria-label": "補完の候補",
		role: listboxId ? "listbox" : undefined,
		id: listboxId,
	};

	if (isPopup) {
		return createPortal(
			<div
				ref={(element) => {
					popupRef.current = element;
					rootRef.current = element;
				}}
				className={styles.popup}
				style={{
					top: position?.top ?? 0,
					left: position?.left ?? 0,
					maxHeight: position?.maxHeight,
					// 入力欄に合わせる幅（field）。
					...(position?.width === undefined
						? {}
						: { width: position.width, maxWidth: "none" }),
					visibility: position && !position.isHidden ? "visible" : "hidden",
				}}
			>
				{list ? (
					<ul className={styles.popupList} ref={listRef} {...listProps}>
						{list}
					</ul>
				) : (
					<output className={styles.notice}>{notice}</output>
				)}
				{list && hint ? <p className={styles.popupHint}>{hint}</p> : null}
			</div>,
			document.body,
		);
	}

	return createPortal(
		<div ref={rootRef} className={styles.bar} style={{ bottom: barBottom }}>
			{list ? (
				<ul className={styles.barList} {...listProps}>
					{list}
				</ul>
			) : (
				<output className={styles.notice}>{notice}</output>
			)}
		</div>,
		document.body,
	);
}
