import { useEffect, useState } from "react";

export type CompletionLayout = "caret" | "keyboard-bar";

// 補完の出し方。PC は、カーソルの近くのメニュー。タッチ操作が主な端末（スマホ）は、キーボードの上の帯。
// サーバーでは判定できないので、最初の描画は PC の形で、ブラウザで切り替える。
// override を渡すと、それを使う（テスト用）。
export function useCompletionLayout(
	override?: CompletionLayout,
): CompletionLayout {
	const [isTouch, setIsTouch] = useState(false);

	useEffect(() => {
		// matchMedia がない環境（テストなど）では、PC として扱う。
		if (typeof window.matchMedia !== "function") {
			return;
		}

		const query = window.matchMedia("(pointer: coarse)");

		function update() {
			setIsTouch(query.matches);
		}

		update();
		query.addEventListener("change", update);

		return () => query.removeEventListener("change", update);
	}, []);

	return override ?? (isTouch ? "keyboard-bar" : "caret");
}
