import {
	type ComponentProps,
	type MouseEvent,
	type PointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "../icon/icon";
import type { IconName } from "../icon/icon-definitions";
import type { IconButtonSize, IconButtonTone } from "./icon-button.css";
import * as styles from "./icon-button.css";

// 説明を出すまでの時間（ミリ秒）。タッチは長押し、マウスは少し置いたとき。
const tipTouchDelayMs = 450;
const tipMouseDelayMs = 700;
// 長押しで出した説明を、そのまま見せておく時間。
const tipTouchVisibleMs = 1600;
// 吹き出しの中心が、画面の端に寄りすぎないようにする余白（px）。
const tipEdgeMargin = 56;

type IconButtonProps = Omit<
	ComponentProps<"button">,
	"children" | "className" | "style" | "aria-label"
> & {
	icon: IconName;
	// 読み上げる名前（必須。アイコンだけのボタンのため）。
	label: string;
	// std：見た目も 44px。sm（既定）：見た目は 36px で、押せる範囲は 44px。
	size?: IconButtonSize;
	// muted（既定）：薄い灰色の丸／plain：背景なし／danger：赤い文字／on：選択中（黄色の丸＋濃い枠）。
	tone?: IconButtonTone;
	iconSize?: 16 | 20 | 24;
	// 並べ替えのつかみ部分（タッチで動かしたとき、スクロールではなくドラッグになるよう、スクロールを止める）。
	dragHandle?: boolean;
};

// アイコンだけのボタン（閉じる・戻る・編集・並べ替え・その他 など）。
export function IconButton({
	icon,
	label,
	size = "sm",
	tone = "muted",
	iconSize,
	dragHandle = false,
	type = "button",
	ref,
	onClick,
	onPointerDown,
	onPointerEnter,
	onPointerLeave,
	onPointerUp,
	onPointerCancel,
	...rest
}: IconButtonProps) {
	const buttonRef = useRef<HTMLButtonElement>(null);
	const [tip, setTip] = useState<{
		x: number;
		y: number;
		below: boolean;
	} | null>(null);
	const showTimer = useRef<number | undefined>(undefined);
	const hideTimer = useRef<number | undefined>(undefined);
	// 長押しで説明を出したあとの、指を離したときのクリックは、押したことにしない。
	const justShown = useRef(false);

	useEffect(
		() => () => {
			window.clearTimeout(showTimer.current);
			window.clearTimeout(hideTimer.current);
		},
		[],
	);

	function scheduleTip(delay: number, byTouch: boolean) {
		if (dragHandle) return;

		window.clearTimeout(showTimer.current);
		showTimer.current = window.setTimeout(() => {
			const rect = buttonRef.current?.getBoundingClientRect();

			if (rect) {
				const below = rect.top < 48;

				setTip({
					x: Math.min(
						window.innerWidth - tipEdgeMargin,
						Math.max(tipEdgeMargin, rect.left + rect.width / 2),
					),
					y: below ? rect.bottom + 8 : rect.top - 8,
					below,
				});
			}

			justShown.current = byTouch;

			if (byTouch) {
				window.clearTimeout(hideTimer.current);
				hideTimer.current = window.setTimeout(() => {
					setTip(null);
					justShown.current = false;
				}, tipTouchVisibleMs);
			}
		}, delay);
	}

	function cancelTip(hide: boolean) {
		window.clearTimeout(showTimer.current);

		if (hide) setTip(null);
	}

	function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
		onPointerDown?.(event);

		if (event.pointerType !== "mouse") {
			justShown.current = false;
			scheduleTip(tipTouchDelayMs, true);
		}
	}

	function handlePointerEnter(event: PointerEvent<HTMLButtonElement>) {
		onPointerEnter?.(event);

		if (event.pointerType === "mouse") scheduleTip(tipMouseDelayMs, false);
	}

	function handleClick(event: MouseEvent<HTMLButtonElement>) {
		if (justShown.current) {
			justShown.current = false;
			event.preventDefault();

			return;
		}

		onClick?.(event);
	}

	return (
		<button
			{...rest}
			ref={(element) => {
				buttonRef.current = element;

				if (typeof ref === "function") ref(element);
				else if (ref) ref.current = element;
			}}
			className={styles.button({ size, tone, dragHandle })}
			type={type}
			aria-label={label}
			onClick={handleClick}
			onPointerDown={handlePointerDown}
			onPointerEnter={handlePointerEnter}
			onPointerLeave={(event) => {
				onPointerLeave?.(event);
				cancelTip(true);
			}}
			onPointerUp={(event) => {
				onPointerUp?.(event);
				// 指を離したら、押したのでなければ、すぐ消す必要はない（少しの間、読める）。
				cancelTip(false);
			}}
			onPointerCancel={(event) => {
				onPointerCancel?.(event);
				cancelTip(true);
			}}
		>
			<Icon name={icon} size={iconSize ?? (size === "std" ? 24 : 20)} />
			{tip && typeof document !== "undefined"
				? // ダイアログの見出しなどに隠れないよう、画面の最前面に出す。
					createPortal(
						<span
							className={styles.tip}
							aria-hidden="true"
							style={{
								left: tip.x,
								top: tip.y,
								transform: `translate(-50%, ${tip.below ? "0" : "-100%"})`,
							}}
						>
							{label}
						</span>,
						document.body,
					)
				: null}
		</button>
	);
}
