import {
	type ReactNode,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { IconButton } from "../icon-button/icon-button";
import * as styles from "./sheet.css";
import {
	backdropProgress,
	displayVisible,
	estimateVelocity,
	resolveRelease,
	type Sample,
	snapsToVisible,
} from "./sheet-physics";
import { useBodyScrollLock } from "./use-body-scroll-lock";
import { useModalFocus } from "./use-modal-focus";
import { useVisualViewport } from "./use-visual-viewport";

const EXIT_FALLBACK_MS = 480;
const REDUCED_MOTION_EXIT_MS = 160;
// この距離（px）より動いたら、スクロールではなく、ドラッグとみなす。
const DRAG_START_DISTANCE = 4;

type SheetProps = {
	open: boolean;
	// 閉じてほしいとき（暗幕・つかんで下げた・Esc・閉じるボタン）。
	onOpenChange: (open: boolean) => void;
	// 読み上げる名前。見出しにも出る。
	title: string;
	// 見出しの左（戻る矢印など）／右（閉じるボタンの手前）。
	headerLeading?: ReactNode;
	headerTrailing?: ReactNode;
	closeLabel?: string;
	children: ReactNode;
	// 下に固定する操作バー。
	footer?: ReactNode;
	// 止まる高さ（画面の高さの割合）。小さい順に、いくつでも。既定は 1つ（0.92）。
	snapPoints?: readonly number[];
	// 最初に止まる位置（snapPoints の番号）。
	defaultSnapIndex?: number;
	// 止まる位置が変わったとき。
	onSnapChange?: (index: number) => void;
	// false にすると、つかんで下げても、暗幕を押しても、閉じない。
	dismissible?: boolean;
	// bottom：スマホ（下から）／right：PC（右から。つかんで動かす操作はなし）。
	placement?: "bottom" | "right";
	// 本文の余白（既定は、あり）。
	padded?: boolean;
	// false にすると、暗幕を出さず、後ろの画面を操作できる「浮いたパネル」になる（続けて入力する場面向け）。
	// 閉じるのは、閉じるボタン・つかんで下げる・パネルの中での Esc。
	modal?: boolean;
};

function prefersReducedMotion() {
	return (
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

const interactiveSelector =
	"button, a, input, select, textarea, label, [data-sheet-no-drag]";

// ボトムシート（スマホ）／右のパネル（PC）。
// 操作感：つかんで動かせる（勢い・ゴムのような抵抗・止まる位置への吸い付き）、下に引いて閉じる、
// 本文は、先頭にいるときだけ、下へのドラッグがシートの操作になる。
export function Sheet({
	open,
	onOpenChange,
	title,
	headerLeading,
	headerTrailing,
	closeLabel = "閉じる",
	children,
	footer,
	snapPoints = [0.92],
	defaultSnapIndex = 0,
	onSnapChange,
	dismissible = true,
	placement = "bottom",
	padded = true,
	modal = true,
}: SheetProps) {
	const isBottom = placement === "bottom";
	const [mounted, setMounted] = useState(open);
	const [activeIndex, setActiveIndex] = useState(defaultSnapIndex);
	const [isDragging, setIsDragging] = useState(false);

	// 最後に置いた、止まる位置の組（画面の大きさの変化を見分ける）。
	const placedSnapsKey = useRef<string | null>(null);
	const portalRef = useRef<HTMLDivElement>(null);
	const panelRef = useRef<HTMLElement>(null);
	const scrimRef = useRef<HTMLDivElement>(null);
	const scrollerRef = useRef<HTMLDivElement>(null);
	const footerRef = useRef<HTMLDivElement>(null);

	const viewport = useVisualViewport(mounted);
	const snaps = useMemo(
		() => snapsToVisible(snapPoints, viewport.height),
		[snapPoints, viewport.height],
	);
	const height = snaps[snaps.length - 1] ?? 0;
	const lowest = snaps[0] ?? 0;
	const lastIndex = snaps.length - 1;
	const currentIndex = Math.min(activeIndex, Math.max(0, lastIndex));

	// ドラッグ中に、最新の値を読むための控え。
	const latest = useRef({
		snaps,
		height,
		lowest,
		activeIndex: currentIndex,
		dismissible,
		open,
		isBottom,
	});
	latest.current = {
		snaps,
		height,
		lowest,
		activeIndex: currentIndex,
		dismissible,
		open,
		isBottom,
	};

	useBodyScrollLock(mounted && modal);
	useModalFocus(mounted && modal, panelRef, portalRef);

	// 見える高さ visible へ、シートと暗幕を動かす。
	const place = useCallback((visible: number, animate: boolean) => {
		const panel = panelRef.current;
		const scrim = scrimRef.current;
		const {
			height: sheetHeight,
			lowest: lowestSnap,
			isBottom: bottom,
		} = latest.current;

		if (!panel) {
			return;
		}

		const reduced = prefersReducedMotion();
		const transition = `var(--duration-sheet) var(--ease-sheet)`;

		if (bottom) {
			panel.style.transition = animate
				? reduced
					? `opacity ${transition}`
					: `transform ${transition}`
				: "none";
			panel.style.transform = `translate3d(0, ${sheetHeight - visible}px, 0)`;
			panel.style.opacity = reduced && visible <= 0 ? "0" : "1";

			// パネルは、最大の高さのまま下へずらしているので、低い位置で止まると、一番下の操作バーが画面の外に出る。
			// 最も低い位置までは、ずらした分だけ、操作バーを引き上げて、見える範囲の下に置く。
			// それより下（閉じるとき）は、パネルといっしょに動く。
			const footer = footerRef.current;

			if (footer) {
				const hidden = Math.max(0, sheetHeight - Math.max(visible, lowestSnap));

				footer.style.transition =
					animate && !reduced ? `transform ${transition}` : "none";
				footer.style.transform = `translate3d(0, ${-hidden}px, 0)`;
			}
		} else {
			// 右のパネル：幅いっぱいを、横に動かす。
			const shift = visible <= 0 ? 100 : 0;

			panel.style.transition = animate
				? reduced
					? `opacity ${transition}`
					: `transform ${transition}`
				: "none";
			panel.style.transform = `translate3d(${shift}%, 0, 0)`;
			panel.style.opacity = reduced && visible <= 0 ? "0" : "1";
		}

		if (scrim) {
			scrim.style.transition = animate ? `opacity ${transition}` : "none";
			scrim.style.opacity = String(
				bottom ? backdropProgress(visible, lowestSnap) : visible <= 0 ? 0 : 1,
			);
		}
	}, []);

	// 開く・閉じる。
	useLayoutEffect(() => {
		if (!mounted) {
			return;
		}

		const { snaps: currentSnaps } = latest.current;

		if (open) {
			// 開くたびに、最初の位置から始める。
			const startIndex = Math.min(
				defaultSnapIndex,
				Math.max(0, currentSnaps.length - 1),
			);

			setActiveIndex(startIndex);
			placedSnapsKey.current = currentSnaps.join(",");
			// 閉じた位置から始めて、次の描画で、開く位置へ動かす。
			place(0, false);
			void panelRef.current?.offsetHeight;
			place(currentSnaps[startIndex] ?? 0, true);

			return;
		}

		place(0, true);
		const timer = window.setTimeout(
			() => setMounted(false),
			prefersReducedMotion() ? REDUCED_MOTION_EXIT_MS : EXIT_FALLBACK_MS,
		);

		return () => window.clearTimeout(timer);
	}, [open, mounted, place, defaultSnapIndex]);

	useEffect(() => {
		if (open) {
			setMounted(true);
		}
	}, [open]);

	// 画面の大きさ（キーボードの出入りを含む）が変わって、止まる位置が変わったときだけ、置き直す。
	// 開くとき・指を離したときは、それぞれが動きを付けて動かすので、ここでは触らない（動きを打ち消してしまう）。
	const snapsKey = snaps.join(",");

	useLayoutEffect(() => {
		if (!mounted || !open || drag.current) {
			return;
		}

		if (placedSnapsKey.current === snapsKey) {
			return;
		}

		placedSnapsKey.current = snapsKey;
		place(snaps[latest.current.activeIndex] ?? 0, false);
	}, [mounted, open, snapsKey, snaps, place]);

	// 浮いたパネルは、開いたときに、パネルへフォーカスを移す（閉じたら、元の場所へ戻す）。
	useEffect(() => {
		if (!open || modal || !mounted) {
			return;
		}

		const opener =
			document.activeElement instanceof HTMLElement
				? document.activeElement
				: null;
		const panel = panelRef.current;

		if (panel && !panel.contains(document.activeElement)) {
			panel.focus({ preventScroll: true });
		}

		return () => {
			if (opener?.isConnected) {
				opener.focus({ preventScroll: true });
			}
		};
	}, [open, modal, mounted]);

	// Esc で閉じる（浮いたパネルは、パネルの中にフォーカスがあるときだけ）。
	useEffect(() => {
		if (!open) {
			return;
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (!modal && !panelRef.current?.contains(document.activeElement)) {
				return;
			}

			if (event.key === "Escape" && latest.current.dismissible) {
				event.stopPropagation();
				onOpenChange(false);
			}
		}

		document.addEventListener("keydown", handleKeyDown);

		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [open, modal, onOpenChange]);

	// ---- ドラッグ ----
	const drag = useRef<{
		startY: number;
		startVisible: number;
		samples: Sample[];
		lastVisible: number;
	} | null>(null);

	const beginDrag = useCallback((y: number, t: number) => {
		const { snaps: currentSnaps, activeIndex: index } = latest.current;
		const startVisible = currentSnaps[index] ?? 0;

		drag.current = {
			startY: y,
			startVisible,
			samples: [{ y, t }],
			lastVisible: startVisible,
		};
		setIsDragging(true);
		// 動かしている途中は、アニメーションを切る。
		if (panelRef.current) {
			panelRef.current.style.transition = "none";
		}
		if (scrimRef.current) {
			scrimRef.current.style.transition = "none";
		}
	}, []);

	const moveDrag = useCallback(
		(y: number, t: number) => {
			const state = drag.current;

			if (!state) {
				return;
			}

			state.samples.push({ y, t });
			if (state.samples.length > 12) {
				state.samples.shift();
			}

			const raw = state.startVisible - (y - state.startY);
			const { snaps: currentSnaps, dismissible: canDismiss } = latest.current;
			const visible = displayVisible(raw, currentSnaps, canDismiss);

			state.lastVisible = visible;
			place(visible, false);
		},
		[place],
	);

	const endDrag = useCallback(
		(t: number) => {
			const state = drag.current;

			drag.current = null;
			setIsDragging(false);

			if (!state) {
				return;
			}

			const {
				snaps: currentSnaps,
				dismissible: canDismiss,
				activeIndex: index,
			} = latest.current;
			const decision = resolveRelease({
				visible: state.lastVisible,
				velocity: estimateVelocity(state.samples, t),
				snaps: currentSnaps,
				dismissible: canDismiss,
			});

			if (decision.type === "dismiss") {
				onOpenChange(false);
				// 親が閉じなかったとき（確認中など）は、元の位置へ戻す。
				window.setTimeout(() => {
					if (latest.current.open) {
						place(currentSnaps[latest.current.activeIndex] ?? 0, true);
					}
				}, 80);

				return;
			}

			place(currentSnaps[decision.index] ?? 0, true);

			if (decision.index !== index) {
				setActiveIndex(decision.index);
				onSnapChange?.(decision.index);
			}
		},
		[onOpenChange, onSnapChange, place],
	);

	// つかみ・見出し：あらゆる入力（指・マウス・ペン）で動かせる。
	// 動きは、ポインターキャプチャに頼らず、window で受ける（シートの外へ出ても、追いかけられる）。
	const handlers = useRef({ move: moveDrag, end: endDrag });
	handlers.current = { move: moveDrag, end: endDrag };
	const stopPointerDrag = useRef<(() => void) | null>(null);

	useEffect(() => () => stopPointerDrag.current?.(), []);

	function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
		if (!isBottom || drag.current) {
			return;
		}
		if (event.pointerType === "mouse" && event.button !== 0) {
			return;
		}
		if (
			event.target instanceof Element &&
			event.target.closest(interactiveSelector)
		) {
			return;
		}

		const { pointerId } = event;

		try {
			event.currentTarget.setPointerCapture(pointerId);
		} catch {
			// キャプチャできなくても、window で動きを受けるので、続けられる。
		}

		beginDrag(event.clientY, event.timeStamp);

		const onMove = (moveEvent: PointerEvent) => {
			if (moveEvent.pointerId === pointerId) {
				handlers.current.move(moveEvent.clientY, moveEvent.timeStamp);
			}
		};
		const stop = () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onEnd);
			window.removeEventListener("pointercancel", onEnd);
			stopPointerDrag.current = null;
		};
		const onEnd = (endEvent: PointerEvent) => {
			if (endEvent.pointerId !== pointerId) {
				return;
			}

			stop();
			handlers.current.end(endEvent.timeStamp);
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onEnd);
		window.addEventListener("pointercancel", onEnd);
		stopPointerDrag.current = stop;
	}

	// 本文：指で、シートを動かす（スクロールとの調停）。
	// - 先頭までスクロールしていて、下へ動かしたとき → シートを下げる
	// - 最も高い位置ではないとき、上へ動かしたとき → シートを上げる
	// - それ以外 → ふつうのスクロール
	useEffect(() => {
		const scroller = scrollerRef.current;

		if (!mounted || !isBottom || !scroller) {
			return;
		}

		let mode: "undecided" | "drag" | "scroll" | null = null;
		let startY = 0;

		function onTouchStart(event: TouchEvent) {
			const touch = event.touches[0];

			if (event.touches.length !== 1 || !touch) {
				mode = null;

				return;
			}

			if (
				event.target instanceof Element &&
				event.target.closest("[data-sheet-no-drag]")
			) {
				mode = null;

				return;
			}

			mode = "undecided";
			startY = touch.clientY;
		}

		function onTouchMove(event: TouchEvent) {
			const touch = event.touches[0];

			if (!mode || !scroller || !touch) {
				return;
			}

			if (mode === "undecided") {
				const delta = touch.clientY - startY;

				if (Math.abs(delta) < DRAG_START_DISTANCE) {
					return;
				}

				const goingDown = delta > 0;
				const atTop = scroller.scrollTop <= 0;
				const atHighest =
					latest.current.activeIndex >= latest.current.snaps.length - 1;

				if ((goingDown && atTop) || (!goingDown && !atHighest)) {
					mode = "drag";
					beginDrag(touch.clientY, event.timeStamp);
				} else {
					mode = "scroll";
				}
			}

			if (mode === "drag") {
				// ふつうのスクロールを止めて、シートだけを動かす。
				event.preventDefault();
				moveDrag(touch.clientY, event.timeStamp);
			}
		}

		function onTouchEnd(event: TouchEvent) {
			if (mode === "drag") {
				endDrag(event.timeStamp);
			}

			mode = null;
		}

		scroller.addEventListener("touchstart", onTouchStart, { passive: true });
		scroller.addEventListener("touchmove", onTouchMove, { passive: false });
		scroller.addEventListener("touchend", onTouchEnd);
		scroller.addEventListener("touchcancel", onTouchEnd);

		return () => {
			scroller.removeEventListener("touchstart", onTouchStart);
			scroller.removeEventListener("touchmove", onTouchMove);
			scroller.removeEventListener("touchend", onTouchEnd);
			scroller.removeEventListener("touchcancel", onTouchEnd);
		};
	}, [mounted, isBottom, beginDrag, moveDrag, endDrag]);

	// 暗幕の上でのスクロールは、背景に伝えない。
	useEffect(() => {
		const scrim = scrimRef.current;

		if (!mounted || !scrim) {
			return;
		}

		const prevent = (event: TouchEvent) => event.preventDefault();

		scrim.addEventListener("touchmove", prevent, { passive: false });

		return () => scrim.removeEventListener("touchmove", prevent);
	}, [mounted]);

	if (!mounted || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div className={styles.root} ref={portalRef}>
			{modal ? (
				<div
					className={styles.scrim}
					ref={scrimRef}
					aria-hidden="true"
					onClick={() => {
						if (dismissible) {
							onOpenChange(false);
						}
					}}
				/>
			) : null}
			<section
				className={styles.panel}
				ref={panelRef}
				role="dialog"
				aria-modal={modal}
				aria-label={title}
				tabIndex={-1}
				data-placement={placement}
				data-modal={modal}
				data-dragging={isDragging}
				data-state={open ? "open" : "closed"}
				style={{
					height: isBottom ? `${height}px` : undefined,
					"--sheet-bottom": `${viewport.bottomOffset}px`,
				}}
			>
				<div className={styles.dragZone} onPointerDown={handlePointerDown}>
					<div className={styles.grabber} aria-hidden="true">
						<span className={styles.grabBar} />
					</div>
					<header className={styles.header}>
						{headerLeading}
						<h2 className={styles.title}>{title}</h2>
						{headerTrailing}
						<IconButton
							icon="close"
							label={closeLabel}
							size="std"
							tone="plain"
							onClick={() => onOpenChange(false)}
						/>
					</header>
				</div>

				<div
					className={styles.body}
					ref={scrollerRef}
					data-scrollable={currentIndex >= lastIndex || !isBottom}
					data-padded={padded}
				>
					{children}
				</div>

				{footer ? (
					<div className={styles.footer} ref={footerRef}>
						{footer}
					</div>
				) : null}
			</section>
		</div>,
		document.body,
	);
}
