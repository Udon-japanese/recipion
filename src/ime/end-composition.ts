// 変換中（IME の入力中）の入力欄から、フォーカスを外して、変換を確定させる。
// 確定のイベント（compositionend）を待って、確定した文字を返す。来なければ（Safari など）、少し待って null を返す。
export function endComposition(
	field: HTMLTextAreaElement | HTMLInputElement,
	timeoutMs = 150,
): Promise<string | null> {
	return new Promise((resolve) => {
		function done(event?: Event) {
			field.removeEventListener("compositionend", done);
			window.clearTimeout(timer);
			resolve(event instanceof CompositionEvent ? event.data : null);
		}

		const timer = window.setTimeout(done, timeoutMs);

		field.addEventListener("compositionend", done);
		field.blur();
	});
}

// Mac の Chrome で、文節に区切って変換している途中（例：「冷凍」を選んだまま「う」が残る）にフォーカスを外して確定させると、
// フォーカスを戻したときに、IME が、確定した文字をもう一度入れる（inputType は insertText。beforeinput は来ないので、止められない）。
// 置き換えたあと、少しの間に届く、その入力を取り除き、アプリ（React）にも伝えない。カーソルは、置き換えたあとの位置に戻す。
export function dropLateCommit(
	field: HTMLTextAreaElement | HTMLInputElement,
	committed: string,
	caret: number,
	windowMs = 500,
): void {
	function handleInput(event: Event) {
		if (
			!(event instanceof InputEvent) ||
			event.isComposing ||
			event.inputType !== "insertText" ||
			event.data !== committed
		) {
			return;
		}

		const end = field.selectionStart ?? 0;
		const start = end - committed.length;

		if (start < 0 || field.value.slice(start, end) !== committed) {
			return;
		}

		// 入力欄の上で止めると、画面の全体で受けている React には届かない（値は、ここで元に戻す）。
		event.stopImmediatePropagation();
		field.value = `${field.value.slice(0, start)}${field.value.slice(end)}`;
		field.setSelectionRange(caret, caret);
		stop();
	}

	function stop() {
		field.removeEventListener("input", handleInput, true);
		window.clearTimeout(timer);
	}

	const timer = window.setTimeout(stop, windowMs);

	field.addEventListener("input", handleInput, true);
}

// フォーカスを戻して、カーソルを置く。フォーカスを外す処理の最中の focus() は、取り消されることがあるので、次の処理で行う。
export function restoreFocus(
	field: HTMLTextAreaElement | HTMLInputElement,
	caret: number,
	retryMs = 50,
): void {
	function focusAt() {
		field.focus();
		field.setSelectionRange(caret, caret);
	}

	window.setTimeout(() => {
		focusAt();
		window.setTimeout(() => {
			if (field.ownerDocument.activeElement !== field) {
				focusAt();
			}
		}, retryMs);
	}, 0);
}
