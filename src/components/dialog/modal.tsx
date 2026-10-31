import { type KeyboardEvent, type ReactNode, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { IconButton } from "../icon-button/icon-button";
import { useBodyScrollLock } from "../sheet/use-body-scroll-lock";
import { useModalFocus } from "../sheet/use-modal-focus";
import * as styles from "./modal.css";

type ModalProps = {
	open: boolean;
	// 閉じてほしいとき（暗幕・Esc・閉じるボタン）。
	onOpenChange: (open: boolean) => void;
	title: string;
	children: ReactNode;
	// 下に固定する操作（右寄せ）。
	footer?: ReactNode;
	// 読む文章や、縦に並べる入力の画面は、幅を狭くする（広い表は、狭くしない）。
	narrow?: boolean;
};

// 幅の広いモーダル（PC で、入力と確認を並べるような、広い作業の画面）。中央に出す。
// 確認のダイアログ（ConfirmDialog）は、短い確認だけに使う。
export function Modal({
	open,
	onOpenChange,
	title,
	children,
	footer,
	narrow = false,
}: ModalProps) {
	const titleId = useId();
	const portalRef = useRef<HTMLDivElement>(null);
	const dialogRef = useRef<HTMLDivElement>(null);

	useModalFocus(open, dialogRef, portalRef);
	useBodyScrollLock(open);

	if (!open || typeof document === "undefined") {
		return null;
	}

	// Esc は、中の入力欄（補完を閉じる Esc など）が先に受けられるよう、中から伝わってきたものだけ扱う。
	function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
		if (event.key === "Escape" && !event.nativeEvent.isComposing) {
			event.stopPropagation();
			onOpenChange(false);
		}
	}

	return createPortal(
		<div className={styles.root} ref={portalRef}>
			<div
				className={styles.scrim}
				aria-hidden
				onClick={() => onOpenChange(false)}
			/>
			<div
				className={styles.modal}
				data-narrow={narrow}
				ref={dialogRef}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabIndex={-1}
				onKeyDown={handleKeyDown}
			>
				<div className={styles.header}>
					<h2 className={styles.title} id={titleId}>
						{title}
					</h2>
					<IconButton
						icon="close"
						label="閉じる"
						size="std"
						tone="plain"
						onClick={() => onOpenChange(false)}
					/>
				</div>
				<div className={styles.body}>{children}</div>
				{footer ? <div className={styles.footer}>{footer}</div> : null}
			</div>
		</div>,
		document.body,
	);
}
