import { useEffect } from "react";
// インストールの確認（beforeinstallprompt）は早く届くことがあるため、全画面で読み込むこのファイルから、受け取りを始める。
import "../infrastructure/install-prompt";

export async function registerPwaServiceWorker(
	isDevelopment = import.meta.env.DEV,
): Promise<void> {
	if (isDevelopment || !("serviceWorker" in navigator)) {
		return;
	}

	await navigator.serviceWorker.register("/sw.js");
}

export function PwaRegister() {
	useEffect(() => {
		void registerPwaServiceWorker().catch(() => {
			/*
			 * Service Worker登録失敗だけで、
			 * アプリ本体を使用不能にはしない。
			 */
		});
	}, []);

	return null;
}
