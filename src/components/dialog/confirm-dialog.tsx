import type { ReactNode } from "react";
import { CornerSheet } from "../corner-sheet/corner-sheet";
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
// 見た目は、上のカード＋下の角のボタン（スマホ）／カードの下の右寄せのボタン（PC）。
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
	return (
		<CornerSheet
			open={open}
			role="alertdialog"
			title={title}
			onDismiss={pending ? undefined : onCancel}
			left={{
				label: cancelLabel,
				icon: "close",
				disabled: pending,
				onClick: onCancel,
			}}
			right={{
				label: confirmLabel,
				icon: danger ? "trash" : "check",
				danger,
				pending,
				onClick: onConfirm,
			}}
		>
			{children ? <p className={styles.message}>{children}</p> : null}
		</CornerSheet>
	);
}
