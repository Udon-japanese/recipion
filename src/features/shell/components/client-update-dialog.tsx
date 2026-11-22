import { useSyncExternalStore } from "react";
import {
	dismissClientUpdateRequired,
	isClientUpdateRequired,
	subscribeClientUpdateRequired,
} from "#/api/client-update-required";
import { ConfirmDialog } from "#/components/dialog/confirm-dialog";

type ClientUpdateDialogProps = {
	// 更新する＝ページを読み込み直す（テストでは差し替える）。
	reload?: () => void;
};

// API が「この画面の版は古い」と返したときの、更新の案内（画面全体に1つ）。
// 利用者には「版」ではなく「アプリが新しくなった・更新する」と伝える（ブラウザの「更新」＝読み込み直しと同じ言葉）。
// 読み込み直すと、新しい index.html が開く（Service Worker も、画面を開くときはネットワークを先に見る）。
export function ClientUpdateDialog({
	reload = () => window.location.reload(),
}: ClientUpdateDialogProps) {
	const open = useSyncExternalStore(
		subscribeClientUpdateRequired,
		isClientUpdateRequired,
		() => false,
	);

	return (
		<ConfirmDialog
			open={open}
			title="アプリを更新してください"
			cancelLabel="あとで"
			confirmLabel="更新する"
			onCancel={dismissClientUpdateRequired}
			onConfirm={reload}
		>
			アプリが新しくなりました。更新するまで、保存や読み込みができません。入力中の内容は、更新すると消えます。
		</ConfirmDialog>
	);
}
