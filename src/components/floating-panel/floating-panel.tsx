import {
	type ReactNode,
	type RefObject,
	useEffect,
	useImperativeHandle,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { IconButton } from "#/components/icon-button/icon-button";
import * as styles from "./floating-panel.css";

export const floatingPanelWidth = 440;
const edge = 8;
const keyStep = 24;

export type PanelPosition = { x: number; y: number };

// 呼び出し側から、パネルを動かす（横に別のパネルを並べるとき、場所をあける）。
export type FloatingPanelHandle = { moveTo: (position: PanelPosition) => void };

// 画面の中に収める。
export function clampPanelPosition(
	x: number,
	y: number,
	height = 120,
): PanelPosition {
	return {
		x: Math.min(
			Math.max(x, edge),
			Math.max(edge, window.innerWidth - floatingPanelWidth - edge),
		),
		y: Math.min(
			Math.max(y, edge),
			Math.max(edge, window.innerHeight - height - edge),
		),
	};
}

type FloatingPanelProps = {
	// 横に別のパネルを並べるとき、位置を測るための ID。
	id?: string;
	handleRef?: RefObject<FloatingPanelHandle | null>;
	title: string;
	// 見出しの左（戻るボタン）と、閉じるボタンの左（件数の札など）。
	headerLeading?: ReactNode;
	headerTrailing?: ReactNode;
	footer?: ReactNode;
	children: ReactNode;
	// 開いたときの位置（開いた時に1度だけ呼ぶ）。
	getInitialPosition: () => PanelPosition;
	// スクロールしたとき、パネルの上端を置きたい高さ（開いた元の行の位置）。返せなければ、動かさない。
	// 画面の上下の端で止まる。見出しをつかんで動かしたら、それからは追いかけない。
	followTop?: () => number | null;
	// 動かした位置を知らせる（覚えておきたい呼び出し側のため）。追いかけて動いたときも知らせる。
	onMove?: (position: PanelPosition) => void;
	// Esc を押したとき（フォームが開いていれば、まずフォームを閉じる、のように使う）。
	onEscape: () => void;
	onClose: () => void;
};

// PC の浮いたパネル（モーダルにしない。後ろの画面を見ながら操作できる）。見出しをつかんで、動かせる。
export function FloatingPanel({
	id,
	handleRef,
	title,
	headerLeading,
	headerTrailing,
	footer,
	children,
	getInitialPosition,
	followTop,
	onMove,
	onEscape,
	onClose,
}: FloatingPanelProps) {
	const headingRef = useRef<HTMLHeadingElement>(null);
	const [position, setPosition] = useState(() => {
		const initial = getInitialPosition();

		return clampPanelPosition(initial.x, initial.y);
	});
	const panelRef = useRef<HTMLElement>(null);
	const heightRef = useRef(120);
	const dragRef = useRef<{ dx: number; dy: number } | null>(null);
	// 自分で動かすまでは、開いた元の行を追いかける。
	const followingRef = useRef(true);
	const latest = useRef({ followTop, onMove });
	latest.current = { followTop, onMove };

	function move(x: number, y: number) {
		const next = clampPanelPosition(x, y, heightRef.current);

		setPosition(next);
		onMove?.(next);
	}

	// 人が動かした（ドラッグ・Alt + 矢印キー）。
	function moveByUser(x: number, y: number) {
		followingRef.current = false;
		move(x, y);
	}

	// スクロールしたら、行の高さへ（横の位置は、そのまま。横に並べた編集のために、ずらしていることがある）。
	const follows = followTop !== undefined;
	const positionRef = useRef(position);
	positionRef.current = position;

	useEffect(() => {
		if (!follows) {
			return;
		}

		function follow() {
			const top = followingRef.current ? latest.current.followTop?.() : null;

			if (top === null || top === undefined) {
				return;
			}

			const current = positionRef.current;
			const next = clampPanelPosition(current.x, top, heightRef.current);

			if (next.x === current.x && next.y === current.y) {
				return;
			}

			positionRef.current = next;
			setPosition(next);
			latest.current.onMove?.(next);
		}

		// 一覧の中のスクロールも拾う（capture）。
		window.addEventListener("scroll", follow, { capture: true, passive: true });

		return () =>
			window.removeEventListener("scroll", follow, { capture: true });
	}, [follows]);

	useImperativeHandle(handleRef, () => ({
		moveTo: (next) => move(next.x, next.y),
	}));

	// 開いたら見出しへ。
	useEffect(() => {
		headingRef.current?.focus({ preventScroll: true });
	}, []);

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape" && !event.defaultPrevented) {
				onEscape();
			}
		}

		document.addEventListener("keydown", handleKeyDown);

		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onEscape]);

	// 画面の大きさや、パネルの高さが変わっても、画面の下にはみ出さない（下の行を押したときは、上へずらす）。
	useLayoutEffect(() => {
		const element = panelRef.current;

		function keepInView() {
			heightRef.current = element?.offsetHeight ?? 120;
			setPosition((current) => {
				const next = clampPanelPosition(
					current.x,
					current.y,
					heightRef.current,
				);

				return next.x === current.x && next.y === current.y ? current : next;
			});
		}

		keepInView();
		window.addEventListener("resize", keepInView);
		const observer =
			element && typeof ResizeObserver !== "undefined"
				? new ResizeObserver(keepInView)
				: null;

		if (element) {
			observer?.observe(element);
		}

		return () => {
			window.removeEventListener("resize", keepInView);
			observer?.disconnect();
		};
	}, []);

	return (
		<aside
			id={id}
			ref={panelRef}
			className={styles.panel}
			aria-label={title}
			style={{
				left: position.x,
				top: position.y,
				maxHeight: `calc(100dvh - ${edge * 2}px)`,
			}}
		>
			<div
				className={styles.header}
				onPointerDown={(event) => {
					if ((event.target as HTMLElement).closest("button")) {
						return;
					}

					event.currentTarget.setPointerCapture(event.pointerId);
					dragRef.current = {
						dx: event.clientX - position.x,
						dy: event.clientY - position.y,
					};
				}}
				onPointerMove={(event) => {
					const drag = dragRef.current;

					if (drag) {
						moveByUser(event.clientX - drag.dx, event.clientY - drag.dy);
					}
				}}
				onPointerUp={() => {
					dragRef.current = null;
				}}
				onPointerCancel={() => {
					dragRef.current = null;
				}}
			>
				{headerLeading}
				<h2
					className={styles.title}
					ref={headingRef}
					tabIndex={-1}
					// 見出しにいるとき、Alt + 矢印キーで動かす（ドラッグができない人のため）。
					onKeyDown={(event) => {
						const delta: Record<string, [number, number]> = {
							ArrowLeft: [-keyStep, 0],
							ArrowRight: [keyStep, 0],
							ArrowUp: [0, -keyStep],
							ArrowDown: [0, keyStep],
						};
						const step = event.altKey ? delta[event.key] : undefined;

						if (step) {
							event.preventDefault();
							moveByUser(position.x + step[0], position.y + step[1]);
						}
					}}
				>
					{title}
				</h2>
				{headerTrailing}
				<IconButton icon="close" label="閉じる" onClick={onClose} />
			</div>
			<div className={styles.body}>{children}</div>
			{footer ? <div className={styles.footer}>{footer}</div> : null}
		</aside>
	);
}
