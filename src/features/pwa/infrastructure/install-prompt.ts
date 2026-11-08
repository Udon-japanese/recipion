// ブラウザのインストールの確認（beforeinstallprompt）を受け取って、取っておく置き場。
// イベントは React が動く前に届くことがあるため、モジュールの読み込み時に受け取りを始める。
// beforeinstallprompt は標準になっていない（Chromium 系だけ）。MDN の Window: beforeinstallprompt event。

export type InstallOutcome = "accepted" | "dismissed";

type InstallPromptEvent = Event & {
	prompt: () => Promise<{ outcome: InstallOutcome }>;
};

function isInstallPromptEvent(event: Event): event is InstallPromptEvent {
	return "prompt" in event && typeof event.prompt === "function";
}

export type InstallPromptStore = {
	isAvailable: () => boolean;
	subscribe: (listener: () => void) => () => void;
	// 確認を出す。取ってあるイベントは一度しか使えないため、出したら手放す。
	prompt: () => Promise<InstallOutcome | null>;
};

export function createInstallPromptStore(
	target: EventTarget,
): InstallPromptStore {
	let saved: InstallPromptEvent | null = null;
	const listeners = new Set<() => void>();
	const notify = () => {
		for (const listener of listeners) {
			listener();
		}
	};

	target.addEventListener("beforeinstallprompt", (event) => {
		if (!isInstallPromptEvent(event)) {
			return;
		}

		// ブラウザ自身の案内（下に出る帯）を止め、アプリの入り口からだけ出す。メニューからのインストールは残る。
		event.preventDefault();
		saved = event;
		notify();
	});
	target.addEventListener("appinstalled", () => {
		saved = null;
		notify();
	});

	return {
		isAvailable: () => saved !== null,
		subscribe: (listener) => {
			listeners.add(listener);

			return () => {
				listeners.delete(listener);
			};
		},
		prompt: async () => {
			const event = saved;

			if (!event) {
				return null;
			}

			saved = null;
			notify();

			const { outcome } = await event.prompt();

			return outcome;
		},
	};
}

const unavailableStore: InstallPromptStore = {
	isAvailable: () => false,
	subscribe: () => () => {},
	prompt: async () => null,
};

export const installPromptStore: InstallPromptStore =
	typeof window === "undefined"
		? unavailableStore
		: createInstallPromptStore(window);
