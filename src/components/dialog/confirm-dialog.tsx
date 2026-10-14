import { type ReactNode, useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "../button/button";
import { useModalFocus } from "../sheet/use-modal-focus";
import * as styles from "./confirm-dialog.css";

type ConfirmDialogProps = {
	open: boolean;
	title: string;
	children?: ReactNode;
	cancelLabel: string;
	confirmLabel: string;
	// 取り消せない操作（削除など）は、赤にする。
	danger?: boolean;
	pending?: boolean;
	onCancel: () => void;
	onConfirm: () => void;
};

// 確認のダイアログ（1ステップ）。やめる／実行の2つ。Esc・暗幕でやめる。
export function ConfirmDialog({
	open,
	title,
	children,
	cancelLabel,
	confirmLabel,
	danger = false,
	pending = false,
	onCancel,
	onConfirm,
}: ConfirmDialogProps) {
	const titleId = useId();
	const portalRef = useRef<HTMLDivElement>(null);
	const dialogRef = useRef<HTMLDivElement>(null);

	useModalFocus(open, dialogRef, portalRef);

	useEffect(() => {
		if (!open) {
			return;
		}

		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === "Escape") {
				// 下のシートまで閉じないよう、ここで止める。
				event.stopImmediatePropagation();
				onCancel();
			}
		}

		// シートより先に受ける（キャプチャ）。
		document.addEventListener("keydown", handleKeyDown, true);

		return () => document.removeEventListener("keydown", handleKeyDown, true);
	}, [open, onCancel]);

	if (!open || typeof document === "undefined") {
		return null;
	}

	return createPortal(
		<div className={styles.root} ref={portalRef}>
			<div className={styles.scrim} aria-hidden onClick={onCancel} />
			<div
				className={styles.dialog}
				ref={dialogRef}
				role="alertdialog"
				aria-modal="true"
				aria-labelledby={titleId}
				tabIndex={-1}
			>
				<h2 className={styles.title} id={titleId}>
					{title}
				</h2>
				{children ? <p className={styles.message}>{children}</p> : null}
				<div className={styles.actions}>
					<Button variant="secondary" onClick={onCancel} disabled={pending}>
						{cancelLabel}
					</Button>
					<Button
						variant={danger ? "danger" : "primary"}
						status={pending ? "pending" : "idle"}
						onClick={onConfirm}
					>
						{confirmLabel}
					</Button>
				</div>
			</div>
		</div>,
		document.body,
	);
}
