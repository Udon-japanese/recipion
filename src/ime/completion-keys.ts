// 入力欄の補完の、キー操作の決まり（レシピの本文・買い物メモの「まとめて追加」・食材名の入力で共通）。
// - 変換していないとき：↑↓ で選び、Tab で決める（選んでいなければ先頭）。選んだあとの Enter でも決める。Esc で閉じる。
// - 変換中：Alt（Option）+↑↓ で選び、Tab で決める。素の矢印・Shift+矢印・Enter は、IME に任せる。
//   Enter は、IME が変換中の文字を確定する操作。止めても、Mac の IME は、確定の入力をあとから送ってくるので、補完には使わない。
//   Windows は、1回のキーで keydown が2回届く（1回目は key が Process）。1回目は扱わない。
export type CompletionKey =
	| "up"
	| "down"
	| "accept"
	// 選んでいる候補があるときだけ、決める（Enter）。
	| "accept-selected"
	| "close";

type KeyInput = Pick<
	KeyboardEvent,
	"key" | "code" | "altKey" | "ctrlKey" | "metaKey" | "shiftKey"
>;

// Safari で、IME の変換と Tab のキーのイベントが、続けて届くとみなす時間（ミリ秒）。
// Safari は、Tab を押すと、IME が先に変換して入力が変わってから、キーのイベントが届くので、直前に出ていた候補を使う。
export const previousCompletionWindowMs = 100;

export function readCompletionKey(
	event: KeyInput,
	isComposing: boolean,
): CompletionKey | null {
	const { key, altKey, ctrlKey, metaKey, shiftKey } = event;

	if (isComposing) {
		if (
			altKey &&
			!ctrlKey &&
			!metaKey &&
			!shiftKey &&
			(key === "ArrowDown" || key === "ArrowUp")
		) {
			return key === "ArrowDown" ? "down" : "up";
		}

		// 変換中の Tab は、key が Process になる環境がある（code で見る）。
		return event.code === "Tab" && !shiftKey ? "accept" : null;
	}

	const hasModifier = altKey || ctrlKey || metaKey || shiftKey;

	if (
		(key === "ArrowDown" || key === "ArrowUp") &&
		!ctrlKey &&
		!metaKey &&
		!shiftKey
	) {
		return key === "ArrowDown" ? "down" : "up";
	}

	if (key === "Tab" && !hasModifier) {
		return "accept";
	}

	if (key === "Enter" && !hasModifier) {
		return "accept-selected";
	}

	return key === "Escape" ? "close" : null;
}

// 候補の選択を1つ動かす。選んでいなければ、↓は先頭、↑は末尾。端までいくと、反対側へ回る。
export function stepCompletionIndex(
	current: number | null,
	direction: "up" | "down",
	count: number,
): number | null {
	if (count === 0) {
		return null;
	}

	if (direction === "down") {
		return current === null ? 0 : (current + 1) % count;
	}

	return current === null ? count - 1 : (current - 1 + count) % count;
}
