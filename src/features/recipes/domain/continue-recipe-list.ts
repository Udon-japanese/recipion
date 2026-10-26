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

	const continued = {
		text: `${head}${inserted}${tail}`,
		caret: head.length + inserted.length,
	};

	// 番号の行の途中に挿入したときは、後ろの同じ並びの番号も、1つずつ送る（2, 2 にならない）。
	if (numbered) {
		const insertedLine = head.split("\n").length;
		const [, indent, number, separator] = numbered;

		return (
			renumberRun(
				continued.text,
				continued.caret,
				insertedLine + 1,
				Number(number.normalize("NFKC")) + 2,
				{ indent, separator },
			) ?? continued
		);
	}

	return continued;
}

// 番号の行を削除したあと、同じ並びの番号を、連番に振り直す。
// - before：削除の前の本文、after：削除のあとの本文とカーソル
// - 削除でない編集（文字が増えた、番号の行が減っていない）なら null
// - 並びの先頭の番号は維持する（先頭の行を消したときは、消した行の番号から始める）。数字は半角にそろう
export function renumberRecipeList(
	before: string,
	after: ListContinuation,
): ListContinuation | null {
	if (after.text.length >= before.length) {
		return null;
	}

	// 番号の行が減った、または、行が減った（空になった行を消した）ときだけ。行の中の文字を消しただけでは、振り直さない。
	if (
		countNumberedLines(after.text) >= countNumberedLines(before) &&
		after.text.split("\n").length >= before.split("\n").length
	) {
		return null;
	}

	// 変わった位置（前から一致する長さ）を含む行。
	let changeAt = 0;

	while (
		changeAt < after.text.length &&
		after.text[changeAt] === before[changeAt]
	) {
		changeAt += 1;
	}

	const beforeLines = before.split("\n");
	const lines = after.text.split("\n");
	const changedLine = after.text.slice(0, changeAt).split("\n").length - 1;
	const anchor = parseNumberedLine(lines[changedLine]);

	if (!anchor) {
		return null;
	}

	const isSameRun = (line: string) => {
		const parsed = parseNumberedLine(line);

		return (
			parsed !== null &&
			parsed.indent === anchor.indent &&
			parsed.separator === anchor.separator
		);
	};

	let first = changedLine;

	while (first > 0 && isSameRun(lines[first - 1])) {
		first -= 1;
	}

	// 先頭の行は、削除の前も同じ位置にあった（消した行か、残った先頭の行）。番号が消えていた（空の行を消した）ときは、1から。
	const previousFirst = parseNumberedLine(beforeLines[first]);
	const start = !previousFirst
		? 1
		: previousFirst.indent === anchor.indent &&
				previousFirst.separator === anchor.separator
			? previousFirst.value
			: (parseNumberedLine(lines[first])?.value ?? 1);

	return renumberRun(after.text, after.caret, first, start, anchor);
}

// first 行から続く、同じ字下げ・区切りの番号の行を、start から順に振り直す。変わらなければ null。
function renumberRun(
	text: string,
	selection: number,
	first: number,
	start: number,
	kind: { indent: string; separator: string },
): ListContinuation | null {
	const lines = text.split("\n");
	let caret = selection;
	let offset = 0;
	let changed = false;
	let index = first;
	let expected = start;

	// 先頭の行までの文字数。
	for (let i = 0; i < first; i += 1) {
		offset += lines[i].length + 1;
	}

	while (index < lines.length) {
		const parsed = parseNumberedLine(lines[index]);

		if (
			!parsed ||
			parsed.indent !== kind.indent ||
			parsed.separator !== kind.separator
		) {
			break;
		}

		const label = String(expected);
		const digitsEnd = offset + parsed.indent.length + parsed.digits.length;

		if (parsed.digits !== label) {
			const delta = label.length - parsed.digits.length;

			lines[index] =
				`${parsed.indent}${label}${lines[index].slice(parsed.indent.length + parsed.digits.length)}`;
			changed = true;

			// 書き換えた数字より後ろにあるカーソルは、ずれる。
			if (caret >= digitsEnd) {
				caret += delta;
			}
		}

		offset += lines[index].length + 1;
		expected += 1;
		index += 1;
	}

	return changed ? { text: lines.join("\n"), caret } : null;
}

function parseNumberedLine(line: string) {
	const match = line.match(numberedPattern);

	if (!match) {
		return null;
	}

	return {
		indent: match[1],
		digits: match[2],
		separator: match[3],
		value: Number(match[2].normalize("NFKC")),
	};
}

function countNumberedLines(text: string): number {
	return text.split("\n").filter((line) => numberedPattern.test(line)).length;
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
