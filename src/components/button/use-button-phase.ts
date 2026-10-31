import { useEffect, useRef, useState } from "react";

// 呼び出し側が渡す、操作の状態。
export type ButtonStatus = "idle" | "pending" | "success" | "error";

// 実際に見せている形。
export type ButtonPhase =
	| "idle"
	| "loading"
	| "success"
	| "success-expanded"
	| "error"
	| "error-expanded";

export const BUTTON_TIMINGS = {
	// 処理がこれより短く終わるなら、マスコットを出さずに完了へ進む。
	loadingDelayMs: 150,
	// マスコットを出したら、最低これだけは見せる。
	loadingMinMs: 600,
	// 完了のマークを見せてから、横に広げるまで。
	expandDelayMs: 380,
	// 広がった状態を見せる長さ（その後、元に戻る）。
	successHoldMs: 2000,
	// 失敗は、読む時間を長めにとる。
	errorHoldMs: 3000,
} as const;

// status（外から渡される状態）を、見せ方の段階に変える。
// 完了・失敗は、一定時間のあと、自動で元の形に戻る（画面に残る場合のため）。
//
// 完了・失敗は、「その場で変わるのを見た」ときだけ演じる。ボタンが表示された時点で、すでに完了・失敗だった
// （親の状態が、前の操作の結果のまま残っている）ときは、演じない。
// 親（useButtonAction）の status は、完了したあとも「success」のまま残るので、別の画面に切り替わって
// 新しく表示されたボタンが、前の操作の「完了しました」を、ふたたび見せてしまうため。
export function useButtonPhase(status: ButtonStatus): ButtonPhase {
	const [phase, setPhase] = useState<ButtonPhase>("idle");
	// 表示されたときの status（変わったら、null）。開発時の二重実行でも、同じ判断になるよう、ref で持つ。
	const statusAtMount = useRef<ButtonStatus | null>(status);
	// マスコットを見せ始めた時刻（見せていないときは null）。
	const loadingShownAt = useRef<number | null>(null);

	useEffect(() => {
		const timers: number[] = [];
		const later = (callback: () => void, ms: number) => {
			timers.push(window.setTimeout(callback, ms));
		};

		if (statusAtMount.current !== null && statusAtMount.current !== status) {
			statusAtMount.current = null;
		}

		if (status === "idle") {
			loadingShownAt.current = null;
			setPhase("idle");
		} else if (
			statusAtMount.current === status &&
			(status === "success" || status === "error")
		) {
			// 表示されたときから、すでに終わっていた操作の結果。演じない。
			setPhase("idle");
		} else if (status === "pending") {
			loadingShownAt.current = null;
			later(() => {
				loadingShownAt.current = Date.now();
				setPhase("loading");
			}, BUTTON_TIMINGS.loadingDelayMs);
		} else {
			const hold =
				status === "success"
					? BUTTON_TIMINGS.successHoldMs
					: BUTTON_TIMINGS.errorHoldMs;
			const shownAt = loadingShownAt.current;
			const wait =
				shownAt === null
					? 0
					: Math.max(0, BUTTON_TIMINGS.loadingMinMs - (Date.now() - shownAt));

			const show = () => {
				loadingShownAt.current = null;
				setPhase(status);
				later(() => {
					setPhase(`${status}-expanded`);
					later(() => setPhase("idle"), hold);
				}, BUTTON_TIMINGS.expandDelayMs);
			};

			if (wait === 0) {
				show();
			} else {
				later(show, wait);
			}
		}

		return () => {
			for (const timer of timers) {
				window.clearTimeout(timer);
			}
		};
	}, [status]);

	return phase;
}
