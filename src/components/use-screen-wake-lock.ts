import { useEffect, useState, useSyncExternalStore } from "react";

// 使えるか。サーバーと最初の描画は false（ブラウザで切り替わる）。HTTPS でないと、navigator.wakeLock はない。
function useIsWakeLockSupported(): boolean {
	return useSyncExternalStore(
		() => () => {},
		() => typeof navigator !== "undefined" && "wakeLock" in navigator,
		() => false,
	);
}

// enabled のあいだ、画面を消灯させない（Screen Wake Lock API）。
// - 画面が見えなくなる（タブを切り替える・画面を閉じる）と、ブラウザが、ロックを解くので、見えたときに、取り直す。
// - 低電力などで、断られることがある。その場合は、何もしない（isActive が false のまま）。
export function useScreenWakeLock(enabled: boolean): {
	isSupported: boolean;
	isActive: boolean;
} {
	const isSupported = useIsWakeLockSupported();
	const [isActive, setIsActive] = useState(false);

	useEffect(() => {
		if (!enabled || !isSupported) {
			return;
		}

		let isCancelled = false;
		let isRequesting = false;
		let sentinel: WakeLockSentinel | null = null;

		async function acquire() {
			if (isRequesting || (sentinel && !sentinel.released)) {
				return;
			}

			isRequesting = true;

			try {
				const next = await navigator.wakeLock.request("screen");

				// 待っているあいだに、閉じられた（トグルを切った・画面を離れた）ら、すぐに返す。
				if (isCancelled) {
					void next.release();

					return;
				}

				sentinel = next;
				setIsActive(true);
				next.addEventListener(
					"release",
					() => {
						if (!isCancelled) {
							setIsActive(false);
						}
					},
					{ once: true },
				);
			} catch {
				// 断られた（低電力など）。
				if (!isCancelled) {
					setIsActive(false);
				}
			} finally {
				isRequesting = false;
			}
		}

		function handleVisibilityChange() {
			if (document.visibilityState === "visible") {
				void acquire();
			}
		}

		void acquire();
		document.addEventListener("visibilitychange", handleVisibilityChange);

		return () => {
			isCancelled = true;
			document.removeEventListener("visibilitychange", handleVisibilityChange);
			void sentinel?.release();
		};
	}, [enabled, isSupported]);

	return { isSupported, isActive: enabled && isActive };
}
