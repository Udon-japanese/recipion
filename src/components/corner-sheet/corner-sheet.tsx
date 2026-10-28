import { type ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "../button/button";
import { Icon } from "../icon/icon";
import type { IconName } from "../icon/icon-definitions";
import { Mascot } from "../mascot/mascot";
import { useBodyScrollLock } from "../sheet/use-body-scroll-lock";
import { useModalFocus } from "../sheet/use-modal-focus";
import { useVisualViewport } from "../sheet/use-visual-viewport";
import { useMediaQuery } from "../use-media-query";
import * as styles from "./corner-sheet.css";

type CornerAction = {
	label: string;
	icon: IconName;
	onClick: () => void;
	disabled?: boolean;
	// 処理中（押せない。マスコットが跳ねる。読み上げには、処理中と伝える）。
	pending?: boolean;
	// 取り消せない操作（削除など）は、赤にする（右のボタンだけ）。
	danger?: boolean;
};

type CornerSheetProps = {
	open: boolean;
	title: string;
	// 確認（やめる／実行）は alertdialog。
	role?: "dialog" | "alertdialog";
	// 左下：やめる・戻す側（暗い色）。出さないときは省略。
	left?: CornerAction;
	// 右下：進む・終える側（主役の色）。
	right: CornerAction;
	// ボタンの置き場所。corner（既定）：画面の下の角（スマホ）。inline：カードの中の下端。
	// 入力欄があるときは inline（角のボタンは、キーボードの下に隠れるため）。PC は、いつも、カードの下。
	actions?: "corner" | "inline";
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
			className={`${styles.corner} ${side === "left" ? styles.left : action.danger ? styles.rightDanger : styles.right}`}
			disabled={action.disabled || action.pending}
			aria-busy={action.pending || undefined}
			aria-label={action.label}
			onClick={action.onClick}
		>
			<span
				className={`${styles.label} ${side === "left" ? styles.labelLeft : styles.labelRight} ${action.pending ? styles.labelPending : ""}`}
			>
				<span
					className={`${styles.mark} ${action.pending ? styles.markPending : ""} ${action.pending && side === "right" ? styles.markOnPrimary : ""}`}
				>
					{action.pending ? (
						<Mascot size={22} motion="loop" roam={0.55} />
					) : (
						<Icon name={action.icon} size={24} />
					)}
				</span>
				{action.pending ? null : action.label}
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
	role = "dialog",
	left,
	right,
	actions = "corner",
	onDismiss,
	children,
}: CornerSheetProps) {
	const isDesktop = useMediaQuery("(min-width: 768px)");
	const layout = isDesktop ? "desktop" : "mobile";
	const hasFooter = isDesktop || actions === "inline";
	// カードの中にボタンを置くときは、キーボードを除いた見える範囲に、カードを収める（ボタンが隠れない）。
	const viewport = useVisualViewport(open && hasFooter && !isDesktop);
	const titleId = useId();
	const portalRef = useRef<HTMLDivElement>(null);
	const cardRef = useRef<HTMLDivElement>(null);
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
				// 下のシートまで閉じないよう、ここで止める（シートより先に受ける）。
				event.stopImmediatePropagation();
				onDismissRef.current?.();
			}
		}

		document.addEventListener("keydown", handleKeyDown, true);

		return () => document.removeEventListener("keydown", handleKeyDown, true);
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
			{/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: role は、dialog か alertdialog（どちらも aria-modal に対応） */}
			<div
				className={styles.stage}
				data-layout={layout}
				ref={cardRef}
				role={role}
				aria-modal="true"
				aria-labelledby={titleId}
				tabIndex={-1}
			>
				<section
					className={styles.card}
					data-layout={layout}
					style={
						hasFooter && !isDesktop
							? {
									maxHeight: `calc(${viewport.height}px - 24px - env(safe-area-inset-top, 0px))`,
								}
							: undefined
					}
				>
					<div className={styles.header}>
						<h2 className={styles.title} id={titleId}>
							{title}
						</h2>
					</div>
					<div className={styles.body}>{children}</div>
					{hasFooter ? (
						<div className={styles.footer} data-layout={layout}>
							{left ? (
								<Button
									variant="secondary"
									size="lg"
									fullWidth={!isDesktop}
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
								variant={right.danger ? "danger" : "primary"}
								size="lg"
								fullWidth={!isDesktop}
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
				{hasFooter ? null : (
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
