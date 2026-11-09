import { useEffect, useState } from "react";

// 読み込み中の表示は、すぐ終わるときに一瞬だけ出ると、ちらついて見える。
// value が true のまま delayMs たったときだけ true にする（false には、すぐ戻す）。
export const LOADING_INDICATOR_DELAY_MS = 400;

export function useDelayedFlag(
	value: boolean,
	delayMs: number = LOADING_INDICATOR_DELAY_MS,
): boolean {
	const [delayed, setDelayed] = useState(false);

	useEffect(() => {
		if (!value) {
			setDelayed(false);

			return;
		}

		const timer = window.setTimeout(() => setDelayed(true), delayMs);

		return () => window.clearTimeout(timer);
	}, [value, delayMs]);

	return value && delayed;
}
