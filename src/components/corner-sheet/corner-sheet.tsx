import { type ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "../button/button";
import { Icon } from "../icon/icon";
import type { IconName } from "../icon/icon-definitions";
import { Mascot } from "../mascot/mascot";
import { useBodyScrollLock } from "../sheet/use-body-scroll-lock";
import { useModalFocus } from "../sheet/use-modal-focus";
import { useMediaQuery } from "../use-media-query";
import * as styles from "./corner-sheet.css";

type CornerAction = {
	label: string;
	icon: IconName;
	onClick: () => void;
	disabled?: boolean;
	// 処理中（押せない。マスコットが跳ねる。読み上げには、処理中と伝える）。
	pending?: boolean;
};

type CornerSheetProps = {
	open: boolean;
	title: string;
	// 見出しの上の、小さな添え書き。
	eyebrow?: string;
	// 左下：やめる・戻す側（暗い色）。出さないときは省略。
	left?: CornerAction;
	// 右下：進む・終える側（主役の色）。
	right: CornerAction;
	// Esc と、暗幕を押したとき。安全な動き（ただ閉じる など）を渡す。省略すると、どちらも何も起きない
	// （必ず選んでほしい場面）。
	onDismiss?: () => void;
	children: ReactNode;
};

function Corner({
	action,
	side,
}: {
	action: CornerAction;
	side: "left" | "right";
}) {
	return (
		<button
			type="button"
			className={`${styles.corner} ${side === "left" ? styles.left : styles.right}`}
			disabled={action.disabled || action.pending}
			aria-busy={action.pending || undefined}
			aria-label={action.label}
			onClick={action.onClick}
		>
			<span
				className={`${styles.label} ${side === "left" ? styles.labelLeft : styles.labelRight}`}
			>
				<span
					className={`${styles.mark} ${action.pending && side === "right" ? styles.markOnPrimary : ""}`}
				>
					{action.pending ? (
						<Mascot size={19} motion="loop" />
					) : (
						<Icon name={action.icon} size={24} />
					)}
				</span>
				{action.label}
			</span>
		</button>
	);
}

// 画面の上にカード（情報）、操作はその下。後ろの画面は、薄い暗幕ごしに見える。
// スマホ（768px 未満）：画面の下の左右の角に、四分の円のボタン（親指が届く角で決める）。
// PC・中画面：カードの下に、右寄せで「戻す → 進む」（読み終わった目と、マウスの近くで決める）。
export function CornerSheet({
	open,
	title,
	eyebrow,
	left,
	right,
	onDismiss,
	children,
}: CornerSheetProps) {
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const layout = isDesktop ? "desktop" : "mobile";
	const titleId = useId();
	const portalRef = useRef<HTMLDivElement>(null);
	const cardRef = useRef<HTMLElement>(null);
	const onDismissRef = useRef(onDismiss);
	onDismissRef.current = onDismiss;

	useBodyScrollLock(open);
	useModalFocus(open, cardRef, portalRef);

	useEffect(() => {
		if (!open) {
			return;
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				onDismissRef.current?.();
			}
		}

		document.addEventListener("keydown", handleKeyDown);

		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [open]);

	if (!open || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div className={styles.root} ref={portalRef}>
			<div
				className={styles.scrim}
				aria-hidden="true"
				onClick={() => onDismissRef.current?.()}
			/>
			<div className={styles.stage} data-layout={layout}>
				<section
					className={styles.card}
					data-layout={layout}
					ref={cardRef}
					role="dialog"
					aria-modal="true"
					aria-labelledby={titleId}
					tabIndex={-1}
				>
					<div className={styles.header}>
						{eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
						<h2 className={styles.title} id={titleId}>
							{title}
						</h2>
					</div>
					<div className={styles.body}>{children}</div>
					{isDesktop ? (
						<div className={styles.footer}>
							{left ? (
								<Button
									variant="secondary"
									size="lg"
									leadingIcon={<Icon name={left.icon} size={20} />}
									status={left.pending ? "pending" : "idle"}
									pendingLabel={left.label}
									disabled={left.disabled}
									onClick={left.onClick}
								>
									{left.label}
								</Button>
							) : null}
							<Button
								size="lg"
								leadingIcon={<Icon name={right.icon} size={20} />}
								status={right.pending ? "pending" : "idle"}
								pendingLabel={right.label}
								disabled={right.disabled}
								onClick={right.onClick}
								data-autofocus
							>
								{right.label}
							</Button>
						</div>
					) : null}
				</section>
				{isDesktop ? null : (
					<div className={styles.corners}>
						{left ? <Corner action={left} side="left" /> : null}
						<Corner action={right} side="right" />
					</div>
				)}
			</div>
		</div>,
		document.body,
	);
}
