import {
	type PointerEvent as ReactPointerEvent,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { estimateVelocity, type Sample } from "../sheet/sheet-physics";
import { Toast as ToastView } from "./toast";
import { displayToastOffset, resolveToastRelease } from "./toast-physics";
import {
	dismissToast,
	getToasts,
	removeToast,
	subscribeToasts,
	type Toast,
} from "./toast-store";
import * as styles from "./toast-viewport.css";

const ENTER_MS = 260;
const EXIT_MS = 220;
const SETTLE_MS = 200;
const interactiveSelector = "button, a, input, select, textarea, label";

function prefersReducedMotion() {
	return (
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

// 上へ隠れる位置（自分の高さと、画面の上の余白の分）。
const hiddenTransform = "translate3d(0, calc(-100% - 24px), 0)";

// お知らせを、transform・opacity で動かす（ms が 0 なら、その場で）。動きを減らす設定では、透明度だけ。
function moveToast(
	element: HTMLElement | null,
	transform: string,
	opacity: number,
	ms: number,
) {
	if (!element) {
		return;
	}

	const reduced = prefersReducedMotion();

	element.style.transition =
		ms > 0
			? reduced
				? `opacity ${ms}ms ease`
				: `transform ${ms}ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity ${ms}ms ease`
			: "none";
	element.style.transform = reduced ? "none" : transform;
	element.style.opacity = String(opacity);
}

// getServerSnapshot は、毎回同じ参照を返す必要がある（違うと、警告と再描画の無限ループになる）。
const EMPTY_TOASTS: readonly Toast[] = [];
const getServerSnapshot = () => EMPTY_TOASTS;

// お知らせの置き場。アプリに1か所だけ置く（ルート）。モーダルを開いていても、操作できる（use-modal-focus.ts）。
export function ToastViewport() {
	const toasts = useSyncExternalStore(
		subscribeToasts,
		getToasts,
		getServerSnapshot,
	);

	// 水和（サーバーの HTML と同じ描画）が済んでから、ポータルを出す。最初の描画から出すと、サーバーの HTML と食い違う。
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div className={styles.viewport} data-toast-viewport="">
			{toasts.map((toast) => (
				<ToastItem key={toast.id} toast={toast} />
			))}
		</div>,
		document.body,
	);
}

// お知らせ1つ。出るときは上から下りてきて、消えるときは上へ。
// 指で、上へ動かすと消える（シートと同じく、指に付いて動く）。下へ引くと、少しで止まり、離すと上へ消える。
function ToastItem({ toast }: { toast: Toast }) {
	const ref = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const drag = useRef<{
		startY: number;
		raw: number;
		samples: Sample[];
	} | null>(null);

	// 出る：上に隠れた位置から、下りてくる。
	useLayoutEffect(() => {
		moveToast(ref.current, hiddenTransform, 0, 0);
		void ref.current?.offsetHeight;
		moveToast(ref.current, "translate3d(0, 0, 0)", 1, ENTER_MS);
	}, []);

	// 消える：上へ動かしてから、取り除く。
	useEffect(() => {
		if (!toast.leaving) {
			return;
		}

		moveToast(ref.current, hiddenTransform, 0, EXIT_MS);

		const timer = window.setTimeout(() => removeToast(toast.id), EXIT_MS + 40);

		return () => window.clearTimeout(timer);
	}, [toast.leaving, toast.id]);

	// 時間が来たら消す（動かしている間は、数えない。出し直したら、数え直す）。
	// biome-ignore lint/correctness/useExhaustiveDependencies: 出し直したとき（version が変わったとき）に、数え直すため
	useEffect(() => {
		if (toast.leaving || toast.duration === null || isDragging) {
			return;
		}

		const timer = window.setTimeout(
			() => dismissToast(toast.id),
			toast.duration,
		);

		return () => window.clearTimeout(timer);
	}, [toast.id, toast.duration, toast.version, toast.leaving, isDragging]);

	function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
		if (toast.leaving || drag.current) {
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

		drag.current = {
			startY: event.clientY,
			raw: 0,
			samples: [{ y: event.clientY, t: event.timeStamp }],
		};
		setIsDragging(true);

		const onMove = (moveEvent: PointerEvent) => {
			const state = drag.current;

			if (!state || moveEvent.pointerId !== pointerId) {
				return;
			}

			state.raw = moveEvent.clientY - state.startY;
			state.samples.push({ y: moveEvent.clientY, t: moveEvent.timeStamp });
			if (state.samples.length > 12) {
				state.samples.shift();
			}

			const offset = displayToastOffset(state.raw);

			moveToast(
				ref.current,
				`translate3d(0, ${offset}px, 0)`,
				offset < 0 ? Math.max(0.3, 1 + offset / 120) : 1,
				0,
			);
		};
		const onEnd = (endEvent: PointerEvent) => {
			if (endEvent.pointerId !== pointerId) {
				return;
			}

			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onEnd);
			window.removeEventListener("pointercancel", onEnd);

			const state = drag.current;

			drag.current = null;
			setIsDragging(false);

			if (!state) {
				return;
			}

			const decision = resolveToastRelease({
				raw: state.raw,
				velocity: estimateVelocity(state.samples, endEvent.timeStamp),
			});

			if (decision === "dismiss") {
				dismissToast(toast.id);
			} else {
				moveToast(ref.current, "translate3d(0, 0, 0)", 1, SETTLE_MS);
			}
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onEnd);
		window.addEventListener("pointercancel", onEnd);
	}

	return (
		<div
			ref={ref}
			className={styles.item}
			data-dragging={isDragging}
			data-toast-id={toast.id}
			// 消える動きの途中は、押せず、読み上げない（すでに消えたものとして扱う）。
			aria-hidden={toast.leaving || undefined}
			inert={toast.leaving || undefined}
			onPointerDown={handlePointerDown}
		>
			<ToastView
				tone={toast.tone}
				icon={toast.icon}
				spinning={toast.spinning}
				action={
					toast.action
						? {
								...toast.action,
								// 押したら、お知らせは消す。
								onClick: () => {
									toast.action?.onClick();
									dismissToast(toast.id);
								},
							}
						: undefined
				}
			>
				{toast.message}
			</ToastView>
		</div>
	);
}
