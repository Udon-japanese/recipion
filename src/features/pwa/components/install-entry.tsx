import { useId, useState, useSyncExternalStore } from "react";
import { Button } from "#/components/button/button";
import { IconButton } from "#/components/icon-button/icon-button";
import { useMediaQuery } from "#/components/use-media-query";
import { useStorageItem } from "#/local-storage/use-storage-item";
import { decideInstallGuide, type InstallGuide } from "../domain/install-guide";
import { installCardDismissedItem } from "../infrastructure/install-card-storage";
import {
	type InstallPromptStore,
	installPromptStore,
} from "../infrastructure/install-prompt";
import * as styles from "./install-entry.css";

const noSubscribe = () => () => {};

// iOS のホーム画面のアプリかどうか（iOS 独自の navigator.standalone）。
function readIosStandalone(): boolean {
	return "standalone" in navigator && navigator.standalone === true;
}

// 今の環境で、どの案内を出すか。サーバー描画と最初の描画は none（ブラウザで切り替わる）。
export function useInstallGuide(
	store: InstallPromptStore = installPromptStore,
): InstallGuide {
	const promptAvailable = useSyncExternalStore(
		store.subscribe,
		store.isAvailable,
		() => false,
	);
	const displayStandalone = useMediaQuery("(display-mode: standalone)");
	const iosStandalone = useSyncExternalStore(
		noSubscribe,
		readIosStandalone,
		() => false,
	);
	const userAgent = useSyncExternalStore(
		noSubscribe,
		() => navigator.userAgent,
		() => "",
	);
	const maxTouchPoints = useSyncExternalStore(
		noSubscribe,
		() => navigator.maxTouchPoints,
		() => 0,
	);

	return decideInstallGuide({
		standalone: displayStandalone || iosStandalone,
		promptAvailable,
		userAgent,
		maxTouchPoints,
	});
}

type InstallEntryProps = {
	// 閉じるボタン（×）を押したとき。渡したときだけ、×を出す。
	onDismiss?: () => void;
	// 確認でインストールを選んだとき。
	onInstalled?: () => void;
	store?: InstallPromptStore;
};

// 「アプリとして使う」の案内（設定の上と、ホームに一度だけ）。出せる案内がなければ、何も出さない。
export function InstallEntry({
	onDismiss,
	onInstalled,
	store = installPromptStore,
}: InstallEntryProps) {
	const guide = useInstallGuide(store);
	const [prompting, setPrompting] = useState(false);
	const titleId = useId();

	if (guide === "none") {
		return null;
	}

	async function handleInstall() {
		setPrompting(true);

		try {
			const outcome = await store.prompt();

			if (outcome === "accepted") {
				onInstalled?.();
			}
		} finally {
			setPrompting(false);
		}
	}

	return (
		<section className={styles.card} aria-labelledby={titleId}>
			<div className={styles.head}>
				<h2 className={styles.title} id={titleId}>
					アプリとして使う
				</h2>
				{onDismiss ? (
					<IconButton
						icon="close"
						label="アプリの案内を閉じる"
						tone="plain"
						onClick={onDismiss}
					/>
				) : null}
			</div>
			{guide === "prompt" ? (
				<>
					<p className={styles.text}>
						ホーム画面に追加すると、アプリのように全画面で開けます。
					</p>
					<div>
						<Button
							variant="secondary"
							onClick={() => void handleInstall()}
							disabled={prompting}
						>
							ホーム画面に追加
						</Button>
					</div>
				</>
			) : (
				<>
					<p className={styles.text}>
						共有ボタンから「ホーム画面に追加」を選ぶと、アプリのように全画面で開けます。
					</p>
					<p className={styles.note}>
						追加したアプリでは、もう一度ログインが必要です。ログインしていないときの買い物メモは、引き継がれません。
					</p>
				</>
			)}
		</section>
	);
}

// ホームに一度だけ出す案内。×を押すか、インストールしたら、もう出さない。
export function HomeInstallCard({ store }: { store?: InstallPromptStore }) {
	const [dismissed, setDismissed] = useStorageItem(installCardDismissedItem);

	if (dismissed) {
		return null;
	}

	return (
		<InstallEntry
			store={store}
			onDismiss={() => setDismissed(true)}
			onInstalled={() => setDismissed(true)}
		/>
	);
}
