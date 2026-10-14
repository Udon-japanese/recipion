import { useSyncExternalStore } from "react";

// 画面の条件（幅など）に合っているか。サーバー描画と最初の描画は false（ブラウザで切り替わる）。
export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		(onChange) => {
			if (typeof window === "undefined" || !window.matchMedia) {
				return () => {};
			}

			const list = window.matchMedia(query);

			list.addEventListener("change", onChange);

			return () => list.removeEventListener("change", onChange);
		},
		() =>
			typeof window !== "undefined" && typeof window.matchMedia === "function"
				? window.matchMedia(query).matches
				: false,
		() => false,
	);
}
