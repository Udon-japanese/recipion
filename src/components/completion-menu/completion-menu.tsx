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
import { placePopup } from "./place-popup";
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
};

type Position = { top: number; left: number; maxHeight?: number };

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

		return () => {
			textarea?.removeEventListener("scroll", update);
			window.removeEventListener("resize", update);
		};
	}, [open, textareaRef]);

	// カーソルの近くに出す位置を決める。毎回の描画のあとに測る（候補・本文・カーソルが変わると、大きさや位置が変わるため）。
	// 依存の配列は付けない（結果が同じなら、状態を更新しないので、繰り返さない）。
	useLayoutEffect(() => {
		const textarea = textareaRef.current;
		const popup = popupRef.current;

		if (
			!open ||
			layout !== "caret" ||
			!(textarea instanceof HTMLTextAreaElement) ||
			!popup
		) {
			setPosition((current) => (current === null ? current : null));

			return;
		}

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
			// 縮めているときも、本来の高さで決める（一覧の中身の高さを足す）。
			popup: {
				width: popup.offsetWidth,
				height:
					popup.offsetHeight +
					(listRef.current
						? Math.max(
								0,
								listRef.current.scrollHeight - listRef.current.clientHeight,
							)
						: 0),
			},
			viewport: { width: window.innerWidth, height: window.innerHeight },
			prefer,
		});

		setPosition((current) =>
			current &&
			current.top === placed.top &&
			current.left === placed.left &&
			current.maxHeight === placed.maxHeight
				? current
				: { top: placed.top, left: placed.left, maxHeight: placed.maxHeight },
		);
	});

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
			?.querySelector<HTMLElement>('[aria-current="true"]')
			?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
	}, [activeIndex]);

	if (!open || typeof document === "undefined") {
		return null;
	}

	const isPopup = layout === "caret";
	const list = items
		? items.map((item, index) => (
				<li key={item.key}>
					<button
						type="button"
						className={isPopup ? styles.popupItem : styles.barItem}
						// Tab は、候補の決定に使う。ボタンへは移らない。
						tabIndex={-1}
						aria-current={activeIndex === index}
						// 入力欄のフォーカスを外さないよう、押した時点で決定する。
						onMouseDown={(event) => {
							event.preventDefault();
							onAccept(index);
						}}
					>
						{item.label}
						{item.badge ? (
							<span className={styles.badge}>{item.badge}</span>
						) : null}
					</button>
				</li>
			))
		: null;

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
					visibility: position ? "visible" : "hidden",
				}}
			>
				{list ? (
					<ul
						className={styles.popupList}
						aria-label="補完の候補"
						ref={listRef}
					>
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
				<ul className={styles.barList} aria-label="補完の候補">
					{list}
				</ul>
			) : (
				<output className={styles.notice}>{notice}</output>
			)}
		</div>,
		document.body,
	);
}
