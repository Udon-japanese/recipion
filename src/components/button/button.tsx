import {
	type ComponentProps,
	type MouseEvent,
	type ReactNode,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { Mascot } from "../mascot/mascot";
import type { ButtonSize, ButtonVariant } from "./button.css";
import * as styles from "./button.css";
import { type ButtonStatus, useButtonPhase } from "./use-button-phase";

export type { ButtonSize, ButtonVariant } from "./button.css";

type ButtonProps = Omit<ComponentProps<"button">, "className" | "style"> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
	fullWidth?: boolean;
	// 並びの中での位置（フォームの右端に置くときは "end"）。
	align?: "start" | "end";
	// 操作の状態。渡すと、待機 → 処理中 → 完了/失敗 と形が変わる。
	// 省略すると、ふつうのボタン。
	status?: ButtonStatus;
	// 処理中に読み上げる文言。
	pendingLabel?: string;
	// 完了したときに、ボタンが広がって見せる文言と、読み上げる文言。
	successLabel?: string;
	// 失敗したときの文言。
	errorLabel?: string;
	// ラベルの前に置くアイコン（飾り。読み上げない）。
	leadingIcon?: ReactNode;
	// 無効のボタンを押したときだけ、一瞬出す理由。渡すと、無効でも押せて（aria-disabled）、理由が出る。
	// 常時の文字は、画面をごちゃつかせるので出さない。
	disabledReason?: string;
};

// 理由を見せている時間（ミリ秒）。
const REASON_VISIBLE_MS = 2500;

type Box = { width: number; height: number };

// 押したときの沈み込みなどは CSS。形の変化（マスコット・チェック・広がり）は status で決まる。
export function Button({
	variant = "primary",
	size = "md",
	fullWidth = false,
	align = "start",
	status = "idle",
	pendingLabel = "処理中",
	successLabel = "完了しました",
	errorLabel = "失敗しました",
	leadingIcon,
	disabledReason,
	type = "button",
	onClick,
	children,
	disabled,
	...rest
}: ButtonProps) {
	const phase = useButtonPhase(status);
	const buttonRef = useRef<HTMLButtonElement>(null);
	const textRef = useRef<HTMLSpanElement>(null);
	// 前の描画の status（変わった瞬間を知るため）。
	const lastStatusRef = useRef<ButtonStatus>("idle");
	// 変形のあいだ、もとの大きさを覚えておく（周りがずれないように、場所を保つ）。
	const [box, setBox] = useState<Box | null>(null);
	const [expandedWidth, setExpandedWidth] = useState(0);
	const [isReasonShown, setIsReasonShown] = useState(false);

	const tone = phase.startsWith("error") ? "error" : "success";
	const isExpanded = phase.endsWith("expanded");
	const isIdle = phase === "idle";
	const isBusy = status === "pending";
	// 押しても何も起きないのは、処理中だけ（二重送信の防止）。
	// 完了・失敗の表示中は、押せる（続けて登録するときに、待たされないように）。
	// 押すと、新しい処理が始まり、表示は、処理中に切り替わる。
	const isLocked = isBusy || phase === "loading";
	const isDisabled = Boolean(disabled) && !isLocked;
	// 理由があるときは、disabled にせず（押せるままにして）、押したときに理由を出す。
	const explainsDisabled = isDisabled && disabledReason !== undefined;

	// 理由は、少しだけ見せて、消す。使えるようになったら、すぐに消す。
	useEffect(() => {
		if (!isReasonShown) {
			return;
		}
		if (!explainsDisabled) {
			setIsReasonShown(false);
			return;
		}
		const timer = window.setTimeout(
			() => setIsReasonShown(false),
			REASON_VISIBLE_MS,
		);
		return () => window.clearTimeout(timer);
	}, [isReasonShown, explainsDisabled]);

	// 変形の開始前に、もとの大きさを測る。
	// 状態（status）が変わった直後の描画では、まだ待機の形（横の余白がある）のまま。
	// 形が変わってからだと、余白が 0 になっていて、元より狭く測ってしまい、戻るときに縮みすぎる。
	useLayoutEffect(() => {
		const button = buttonRef.current;
		const changed = lastStatusRef.current !== status;
		lastStatusRef.current = status;
		if (!changed || status === "idle" || box || !button) {
			return;
		}
		const rect = button.getBoundingClientRect();
		// 幅の変化が動きになるよう、数値の幅を先に確定させてから変える。
		button.style.width = `${rect.width}px`;
		void button.offsetWidth;
		setBox({ width: rect.width, height: rect.height });
	}, [status, box]);

	// 広がるときの幅は、文言の長さから決める。
	useLayoutEffect(() => {
		if (phase !== "success" && phase !== "error") {
			return;
		}
		const text = textRef.current;
		if (!text || !box) {
			return;
		}
		const textWidth = measureTextWidth(text);
		setExpandedWidth(Math.ceil(textWidth) + box.height + 40);
	}, [phase, box]);

	// 元の形に戻ったら、少し待って、固定した大きさを手放す。
	useLayoutEffect(() => {
		if (!isIdle || !box) {
			return;
		}
		const timer = window.setTimeout(() => setBox(null), 500);
		return () => window.clearTimeout(timer);
	}, [isIdle, box]);

	function handleClick(event: MouseEvent<HTMLButtonElement>) {
		if (explainsDisabled) {
			event.preventDefault();
			setIsReasonShown(true);
			return;
		}
		if (isLocked) {
			// 送信ボタンの場合は、フォームの送信も止める。
			event.preventDefault();
			return;
		}
		onClick?.(event);
	}

	const width = box
		? isIdle
			? box.width
			: isExpanded
				? expandedWidth
				: box.height
		: undefined;

	const announcement =
		isReasonShown && disabledReason
			? disabledReason
			: status === "pending"
				? pendingLabel
				: status === "success" && !isIdle
					? successLabel
					: status === "error" && !isIdle
						? errorLabel
						: "";

	return (
		<span
			className={styles.wrapper({ fullWidth, align })}
			style={
				box
					? {
							"--box-width": `${box.width}px`,
							"--box-height": `${box.height}px`,
						}
					: undefined
			}
		>
			<button
				{...rest}
				ref={buttonRef}
				className={styles.button({ variant, size, fullWidth })}
				data-phase={phase}
				data-tone={tone}
				type={type}
				disabled={isDisabled && !explainsDisabled}
				data-disabled={isDisabled || undefined}
				aria-busy={isBusy || undefined}
				aria-disabled={isLocked || explainsDisabled || undefined}
				onClick={handleClick}
				style={{
					width,
					height: box ? box.height : undefined,
					"--box-height": box ? `${box.height}px` : undefined,
				}}
			>
				<span className={styles.label}>
					{leadingIcon ? (
						<span className={styles.leadingIcon} aria-hidden="true">
							{leadingIcon}
						</span>
					) : null}
					{children}
				</span>

				<span className={styles.mascotLayer} aria-hidden="true">
					<Mascot
						size={box ? (19 * box.height) / 52 : 19}
						motion={phase === "loading" ? "loop" : "still"}
					/>
				</span>

				<span className={styles.result} aria-hidden="true">
					<span className={styles.resultCircle}>
						{tone === "error" ? <ErrorIcon /> : <CheckIcon />}
					</span>
					<span className={styles.resultText} ref={textRef}>
						{tone === "error" ? errorLabel : successLabel}
					</span>
				</span>
			</button>

			{isReasonShown && disabledReason ? (
				<span className={styles.reason} aria-hidden="true">
					{disabledReason}
				</span>
			) : null}

			<output className={styles.srOnly}>{announcement}</output>
		</span>
	);
}

function measureTextWidth(element: HTMLElement) {
	const range = document.createRange();
	range.selectNodeContents(element);
	return typeof range.getBoundingClientRect === "function"
		? range.getBoundingClientRect().width
		: element.scrollWidth;
}

function CheckIcon() {
	return (
		<svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
			<path d="M5 12.5L10 17.5L19 7" />
		</svg>
	);
}

function ErrorIcon() {
	return (
		<svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
			<path d="M12 6.5V13.5" />
			<path d="M12 17.5V17.6" />
		</svg>
	);
}
