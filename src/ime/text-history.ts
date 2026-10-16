// 入力欄の「元に戻す・やり直し」の履歴（純粋な関数）。
// ブラウザの履歴は、本文を値として書き換えると消えてしまうので、入力欄の編集はすべて、ここに記録する。

export type TextSnapshot = { text: string; caret: number };

// 連続した同じ種類の入力（insert・delete）は、まとめて1回で戻す。ほかは、1回ずつ。
export type EditKind = "insert" | "delete" | "other";

export type TextHistory = {
	// 編集の前の状態（新しいものが後ろ）。
	past: readonly TextSnapshot[];
	// 元に戻した、やり直せる状態（新しいものが後ろ）。
	future: readonly TextSnapshot[];
	// 直前の編集（まとめるかどうかの判断に使う）。
	lastEdit: { after: TextSnapshot; kind: EditKind; at: number } | null;
};

export const emptyTextHistory: TextHistory = {
	past: [],
	future: [],
	lastEdit: null,
};

// 同じ種類の入力を、まとめる時間（ミリ秒）。
const groupWindowMs = 1000;
const maxEntries = 200;

// ブラウザの入力の種類（`InputEvent.inputType`）から、編集の種類を決める。
export function editKindOfInput(inputType: string | undefined): EditKind {
	if (inputType === undefined) {
		return "other";
	}

	if (
		inputType === "insertText" ||
		inputType === "insertCompositionText" ||
		inputType === "insertLineBreak" ||
		inputType === "insertParagraph"
	) {
		return "insert";
	}

	if (
		inputType === "deleteContentBackward" ||
		inputType === "deleteContentForward" ||
		inputType === "deleteWordBackward" ||
		inputType === "deleteWordForward"
	) {
		return "delete";
	}

	return "other";
}

// 編集を記録する。本文が変わっていなければ、何もしない。時刻は、呼び出し側から渡す。
export function recordEdit(
	history: TextHistory,
	before: TextSnapshot,
	after: TextSnapshot,
	kind: EditKind,
	now: number,
): TextHistory {
	if (before.text === after.text) {
		return history;
	}

	const { lastEdit } = history;
	const isGrouped =
		kind !== "other" &&
		lastEdit !== null &&
		lastEdit.kind === kind &&
		now - lastEdit.at <= groupWindowMs &&
		lastEdit.after.text === before.text &&
		lastEdit.after.caret === before.caret;

	return {
		past: isGrouped
			? history.past
			: [...history.past, before].slice(-maxEntries),
		future: [],
		lastEdit: { after, kind, at: now },
	};
}

// 元に戻す。戻せるものがなければ、null。
export function undoEdit(
	history: TextHistory,
	current: TextSnapshot,
): { history: TextHistory; snapshot: TextSnapshot } | null {
	const snapshot = history.past.at(-1);

	if (snapshot === undefined) {
		return null;
	}

	return {
		history: {
			past: history.past.slice(0, -1),
			future: [...history.future, current],
			lastEdit: null,
		},
		snapshot,
	};
}

// やり直す。やり直せるものがなければ、null。
export function redoEdit(
	history: TextHistory,
	current: TextSnapshot,
): { history: TextHistory; snapshot: TextSnapshot } | null {
	const snapshot = history.future.at(-1);

	if (snapshot === undefined) {
		return null;
	}

	return {
		history: {
			past: [...history.past, current],
			future: history.future.slice(0, -1),
			lastEdit: null,
		},
		snapshot,
	};
}
