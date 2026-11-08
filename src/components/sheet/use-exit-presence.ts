import { useEffect, useState } from "react";

// シートが閉じる動き（--duration-sheet）が終わるまでの時間。Sheet が自分を外す時間と同じ。
export const SHEET_EXIT_MS = 480;

// 「開いている間だけ描く」部品を、閉じる動きのあいだも描いたままにする。
// value が null・undefined になっても、最後の値を SHEET_EXIT_MS のあいだ返し続ける（open は false）。
// value は、描画のたびに作り直さない値（state・一覧の要素など）を渡す（毎回新しいと、描き直しが止まらない）。
export function useExitPresence<T>(value: T | null | undefined): {
	value: T | null;
	open: boolean;
} {
	const open = value !== null && value !== undefined;
	const [kept, setKept] = useState<T | null>(open ? value : null);

	// 前の描画からの変化を、描画の中で控える（React の「前回の値を覚える」書き方）。
	if (open && kept !== value) {
		setKept(value);
	}

	useEffect(() => {
		if (open) {
			return;
		}

		const timer = window.setTimeout(() => setKept(null), SHEET_EXIT_MS);

		return () => window.clearTimeout(timer);
	}, [open]);

	return { value: open ? value : kept, open };
}
