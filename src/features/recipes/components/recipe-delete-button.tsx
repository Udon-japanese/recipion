import { useState } from "react";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";
import { describeError } from "#/errors/user-facing-error";

type RecipeDeleteButtonProps = {
	// 確認のダイアログを開く（メニューの「削除」から）。
	open: boolean;
	onClose: () => void;
	onDelete: () => Promise<void>;
};

// 誤って消さないよう、確認のダイアログを出す。失敗したら理由を出して、やり直せる。
export function RecipeDeleteButton({
	open,
	onClose,
	onDelete,
}: RecipeDeleteButtonProps) {
	const [isDeleting, setIsDeleting] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	async function handleDelete() {
		setErrorMessage(null);
		setIsDeleting(true);

		try {
			await onDelete();
		} catch (error) {
			setErrorMessage(describeError(error, "レシピを削除できませんでした"));
		} finally {
			setIsDeleting(false);
		}
	}

	return (
		<ConfirmDialog
			open={open}
			title="このレシピを削除しますか？"
			cancelLabel="キャンセル"
			confirmLabel="削除する"
			danger
			pending={isDeleting}
			onCancel={() => {
				setErrorMessage(null);
				onClose();
			}}
			onConfirm={() => void handleDelete()}
		>
			削除すると、元に戻せません。
			{errorMessage ? (
				<>
					<br />
					<span role="alert">{errorMessage}</span>
				</>
			) : null}
		</ConfirmDialog>
	);
}
