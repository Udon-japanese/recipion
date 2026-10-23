const digitValues: Record<string, number> = {
	〇: 0,
	一: 1,
	二: 2,
	三: 3,
	四: 4,
	五: 5,
	六: 6,
	七: 7,
	八: 8,
	九: 9,
};

const integerSource = "[〇一二三四五六七八九十]+";

// 漢数字の数量：「一と二分の一」「二分の一」「半」「十二」。正規表現に埋め込めるよう、グループは持たない。
export const kanjiNumberSource = `(?:${integerSource}と${integerSource}分の${integerSource}|${integerSource}分の${integerSource}|半|${integerSource})`;

const kanjiNumberPattern = new RegExp(kanjiNumberSource, "gu");

// 100 未満の整数。「十二」「二十」「二十三」「二〇」。ほかの形は読まない。
function parseKanjiInteger(text: string): number | null {
	const tens = text.match(
		/^([一二三四五六七八九])?十([一二三四五六七八九])?$/u,
	);

	if (tens) {
		const value =
			(tens[1] ? (digitValues[tens[1]] ?? 0) : 1) * 10 +
			(tens[2] ? (digitValues[tens[2]] ?? 0) : 0);

		return value;
	}

	if (/^[〇一二三四五六七八九]+$/u.test(text) && text.length <= 2) {
		const value = Number(
			[...text].map((character) => digitValues[character]).join(""),
		);

		return value > 0 ? value : null;
	}

	return null;
}

// 漢数字の数量を、半角の数字の表記（「1」「0.5」「1/2」「1と1/2」）にする。読めなければ null。
export function kanjiNumberToDigits(text: string): string | null {
	if (text === "半") {
		return "0.5";
	}

	const mixed = text.match(
		new RegExp(
			`^(${integerSource})と(${integerSource})分の(${integerSource})$`,
			"u",
		),
	);

	if (mixed) {
		const whole = parseKanjiInteger(mixed[1]);
		const denominator = parseKanjiInteger(mixed[2]);
		const numerator = parseKanjiInteger(mixed[3]);

		return whole !== null && denominator !== null && numerator !== null
			? `${whole}と${numerator}/${denominator}`
			: null;
	}

	const fraction = text.match(
		new RegExp(`^(${integerSource})分の(${integerSource})$`, "u"),
	);

	if (fraction) {
		const denominator = parseKanjiInteger(fraction[1]);
		const numerator = parseKanjiInteger(fraction[2]);

		return denominator !== null && numerator !== null
			? `${numerator}/${denominator}`
			: null;
	}

	const value = parseKanjiInteger(text);

	return value === null ? null : String(value);
}

// 文字列の中の漢数字の数量を、すべて半角の数字に置き換える（読めないものは、そのまま）。
export function replaceKanjiNumbers(text: string): string {
	return text.replace(
		kanjiNumberPattern,
		(found) => kanjiNumberToDigits(found) ?? found,
	);
}
