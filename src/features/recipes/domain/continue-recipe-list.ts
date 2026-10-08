// 番号（1. 1) 1、）か、中黒などの印で始まる行で Enter を押したとき、次の行にも印を付ける。
const numberedPattern = /^(\s*)([0-9０-９]+)([.．)）、])(\s*)(.*)$/u;
const bulletedPattern = /^(\s*)([・●◦•\-*])(\s*)(.*)$/u;

type ListContinuation = { text: string; caret: number };

// Enter を押したときの、本文とカーソルの位置（自動で印を付けない行なら null。そのときは、ふつうの改行）。
// - 印のある行で Enter：次の行に、同じ印（番号は、1つ増やす）を付ける
// - 印だけの行（項目が空）で Enter：印を消す（続けるのをやめる）
export function continueRecipeList(
	text: string,
	selectionStart: number,
	selectionEnd: number,
): ListContinuation | null {
	if (selectionStart !== selectionEnd) {
		return null;
	}

	const lineStart = text.lastIndexOf("\n", selectionStart - 1) + 1;
	const lineEndIndex = text.indexOf("\n", selectionStart);
	const lineEnd = lineEndIndex < 0 ? text.length : lineEndIndex;
	const line = text.slice(lineStart, lineEnd);
	const before = text.slice(lineStart, selectionStart);

	let marker: string;
	let nextMarker: string;
	let content: string;

	const numbered = line.match(numberedPattern);
	const bulleted = numbered ? null : line.match(bulletedPattern);

	if (numbered) {
		const [, indent, number, separator, space] = numbered;

		marker = `${indent}${number}${separator}${space}`;
		nextMarker = `${indent}${Number(number.normalize("NFKC")) + 1}${separator}${space}`;
		content = numbered[5];
	} else if (bulleted) {
		const [, indent, symbol, space] = bulleted;

		marker = `${indent}${symbol}${space}`;
		nextMarker = marker;
		content = bulleted[4];
	} else {
		return null;
	}

	// カーソルが、印の途中（印より前）にあるときは、ふつうの改行。
	const markerLength = line.length - content.length;

	if (before.length < markerLength) {
		return null;
	}

	if (content.trim() === "") {
		// 印だけの行で、行の末尾なら、印を消す。
		if (selectionStart !== lineEnd) {
			return null;
		}

		return {
			text: `${text.slice(0, lineStart)}${text.slice(lineEnd)}`,
			caret: lineStart,
		};
	}

	const head = text.slice(0, selectionStart);
	const tail = text.slice(selectionStart);
	const inserted = `\n${nextMarker}`;

	return {
		text: `${head}${inserted}${tail}`,
		caret: head.length + inserted.length,
	};
}

// カーソルの前が、字下げ・印・空白だけのとき（印の直後）。
const markerBeforeCaretPattern =
	/^(\s*)(?:[0-9０-９]+[.．)）、]|[・●◦•\-*])\s+$/u;

// Backspace を押したときの、本文とカーソルの位置（印の直後でなければ null。そのときは、ふつうの削除）。
// 番号・中黒の印の直後なら、印と空白を、一度に消す（字下げと、印の後ろの文字は、残す）。
export function removeRecipeListMarker(
	text: string,
	selectionStart: number,
	selectionEnd: number,
): ListContinuation | null {
	if (selectionStart !== selectionEnd) {
		return null;
	}

	const lineStart = text.lastIndexOf("\n", selectionStart - 1) + 1;
	const match = text
		.slice(lineStart, selectionStart)
		.match(markerBeforeCaretPattern);

	if (!match) {
		return null;
	}

	const markerStart = lineStart + match[1].length;

	return {
		text: `${text.slice(0, markerStart)}${text.slice(selectionStart)}`,
		caret: markerStart,
	};
}
