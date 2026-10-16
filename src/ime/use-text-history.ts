import { type KeyboardEvent, useEffect, useRef } from "react";
import {
	type EditKind,
	emptyTextHistory,
	recordEdit,
	redoEdit,
	type TextSnapshot,
	undoEdit,
} from "./text-history";

type Options = {
	textareaRef: { readonly current: HTMLTextAreaElement | null };
	// 元に戻す・やり直すで、入力欄に戻す本文とカーソル。
	restore: (snapshot: TextSnapshot) => void;
};

// 入力欄の「元に戻す・やり直す」の履歴（自前）。レシピの本文と、買い物メモの「まとめて追加」で共通。
// 補完や番号の自動入力などで、本文を値として書き換えると、ブラウザの履歴は使えなくなる。
// そのため、普通の入力も含めて、すべて自前で記録する。Cmd/Ctrl+Z・Shift+Z・Ctrl+Y と、メニューからの元に戻す（beforeinput）を、ここで扱う。
export function useTextHistory({ textareaRef, restore }: Options) {
	const historyRef = useRef(emptyTextHistory);

	// 記録の1件（連続した同じ種類の入力は、まとめて1回に戻る）。
	function record(before: TextSnapshot, after: TextSnapshot, kind: EditKind) {
		historyRef.current = recordEdit(
			historyRef.current,
			before,
			after,
			kind,
			Date.now(),
		);
	}

	function step(direction: "undo" | "redo") {
		const textarea = textareaRef.current;

		if (!textarea) {
			return;
		}

		const current = { text: textarea.value, caret: textarea.selectionStart };
		const result = (direction === "undo" ? undoEdit : redoEdit)(
			historyRef.current,
			current,
		);

		if (result) {
			historyRef.current = result.history;
			restore(result.snapshot);
		}
	}

	// キーでの元に戻す・やり直す。扱ったら true。
	function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
		if ((event.metaKey || event.ctrlKey) && !event.altKey) {
			const key = event.key.toLowerCase();

			if (key === "z") {
				event.preventDefault();
				step(event.shiftKey ? "redo" : "undo");

				return true;
			}

			if (key === "y" && !event.metaKey) {
				event.preventDefault();
				step("redo");

				return true;
			}
		}

		return false;
	}

	// メニューからの元に戻す・やり直す（beforeinput の historyUndo / historyRedo）も、自前の履歴で行う。
	const latestStep = useRef(step);
	latestStep.current = step;

	useEffect(() => {
		const textarea = textareaRef.current;

		if (!textarea) {
			return;
		}

		function listener(event: InputEvent) {
			if (event.inputType === "historyUndo") {
				event.preventDefault();
				latestStep.current("undo");
			} else if (event.inputType === "historyRedo") {
				event.preventDefault();
				latestStep.current("redo");
			}
		}

		textarea.addEventListener("beforeinput", listener);

		return () => textarea.removeEventListener("beforeinput", listener);
	}, [textareaRef]);

	return { record, step, handleKeyDown };
}
