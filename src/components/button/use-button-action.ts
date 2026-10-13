import { useCallback, useEffect, useRef, useState } from "react";
import type { ButtonStatus } from "./use-button-phase";

// 非同期の操作の状態（待機・処理中・完了・失敗）を持つ。<Button status={status}> に渡す。
// action が false を返す、または例外を投げると、失敗として扱う（それ以外は完了）。
// エラーの文面は、action の中で（画面の別の場所に）出す。
export function useButtonAction() {
	const [status, setStatus] = useState<ButtonStatus>("idle");
	const running = useRef(false);
	const mounted = useRef(true);

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);

	const run = useCallback(async (action: () => Promise<unknown>) => {
		if (running.current) {
			return;
		}
		running.current = true;
		setStatus("pending");

		let succeeded = true;
		try {
			succeeded = (await action()) !== false;
		} catch {
			succeeded = false;
		}

		running.current = false;
		if (mounted.current) {
			setStatus(succeeded ? "success" : "error");
		}
	}, []);

	return { status, run, isPending: status === "pending" };
}
