import type { ModerationItem } from "./moderation-target";

// 当たった場所。判定に出した文章（listJudgedItems の順）の何番目か、その文章の中の何文字目から何文字目か（原文の位置）。
// 文章そのものは持たない（判定の記録に残すため。同じ内容のときだけ使うので、番号から、送られた文章の場所を引ける）。
// 範囲がないときは、その文章のどこか（AI が部分を示さなかったときなど）。
export type ModerationLocation = {
	item: number;
	start?: number;
	end?: number;
};

// 判定に出す文章（空のものは、判定しない）。場所の番号と、判定の記録のハッシュは、この順で数える。
export function listJudgedItems(
	items: readonly ModerationItem[],
): ModerationItem[] {
	return items.filter((item) => item.text.trim() !== "");
}

// 語が含まれる、いちばん短い範囲を探す（原文の位置）。表記をそろえた文章から、原文の位置へは戻せないので、
// 原文を、左右から1文字ずつ削り、まだ当たるところまで縮める。まず1行ずつ、次に隣り合う2行、最後に全体で探す。
export function locateInText(
	text: string,
	matches: (part: string) => boolean,
): { start: number; end: number } | null {
	const lines: { start: number; end: number }[] = [];
	let lineStart = 0;

	for (const line of text.split("\n")) {
		lines.push({ start: lineStart, end: lineStart + line.length });
		lineStart += line.length + 1;
	}

	const candidates = [
		...lines,
		...lines.slice(1).map((line, index) => ({
			start: lines[index]?.start ?? 0,
			end: line.end,
		})),
		{ start: 0, end: text.length },
	];
	const found = candidates.find((range) =>
		matches(text.slice(range.start, range.end)),
	);

	if (!found) {
		return null;
	}

	let { start, end } = found;

	while (end - start > 1 && matches(text.slice(start + 1, end))) {
		start += 1;
	}

	while (end - start > 1 && matches(text.slice(start, end - 1))) {
		end -= 1;
	}

	return { start, end };
}

// 画面に出す、抜き出しの長さ（これより長い行は、当たった部分の前後だけにする）。
const maxExcerptLength = 60;
// 当たった部分の、前後に残す文字数。
const excerptContext = 15;

function oneLine(text: string): string {
	return text.replace(/\s*\n\s*/gu, " / ").trim();
}

// 利用者に見せる、当たった行（行をまたぐなら、その行すべて）。長い行は、当たった部分と、その前後の数文字。
export function excerptAt(
	text: string,
	range: { start?: number; end?: number } = {},
): string {
	const { start, end } = range;

	if (start === undefined || end === undefined) {
		const whole = oneLine(text);

		return whole.length <= maxExcerptLength
			? whole
			: `${whole.slice(0, maxExcerptLength)}…`;
	}

	const lineStart = text.lastIndexOf("\n", start - 1) + 1;
	const lineEndIndex = text.indexOf("\n", Math.max(end - 1, start));
	const lineEnd = lineEndIndex < 0 ? text.length : lineEndIndex;
	const lines = text.slice(lineStart, lineEnd);

	if (lines.length <= maxExcerptLength) {
		return oneLine(lines);
	}

	const from = Math.max(lineStart, start - excerptContext);
	const to = Math.min(lineEnd, end + excerptContext);

	return `${from > lineStart ? "…" : ""}${oneLine(text.slice(from, to))}${to < lineEnd ? "…" : ""}`;
}
