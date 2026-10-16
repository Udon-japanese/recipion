// 変換中（IME の入力中）の入力欄から、フォーカスを外して、変換を確定させる。
// 確定のイベント（compositionend）を待って、終わる。来なければ（Safari など）、少し待って終わる。
export function endComposition(
	textarea: HTMLTextAreaElement,
	timeoutMs = 150,
): Promise<void> {
	return new Promise((resolve) => {
		function done() {
			textarea.removeEventListener("compositionend", done);
			window.clearTimeout(timer);
			resolve();
		}

		const timer = window.setTimeout(done, timeoutMs);

		textarea.addEventListener("compositionend", done);
		textarea.blur();
	});
}

// フォーカスを戻して、カーソルを置く。フォーカスを外す処理の最中の focus() は、取り消されることがあるので、次の処理で行う。
export function restoreFocus(
	textarea: HTMLTextAreaElement,
	caret: number,
	retryMs = 50,
): void {
	function focusAt() {
		textarea.focus();
		textarea.setSelectionRange(caret, caret);
	}

	window.setTimeout(() => {
		focusAt();
		window.setTimeout(() => {
			if (document.activeElement !== textarea) {
				focusAt();
			}
		}, retryMs);
	}, 0);
}
