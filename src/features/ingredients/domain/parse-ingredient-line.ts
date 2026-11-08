import {
	kanjiNumberSource,
	replaceKanjiNumbers,
} from "#/features/quantity/domain/kanji-numeral";

export type ParsedIngredientLine =
	| {
			status: "parsed";
			rawText: string;
			name: string;
			amountText: string;
			quantity: number | null;
			unitLabel: string | null;
	  }
	| {
			status: "missing-amount";
			rawText: string;
			name: string;
			amountText: null;
			quantity: null;
			unitLabel: null;
	  };

// 「1 1/2」「1と1/2」（帯分数）、「1/2」、「1.5」「1」。
const numericToken = String.raw`(?:\d+(?:\s+|と)\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)`;

// 「60~70g」「大さじ4〜5」「70から80g」「60-70g」のような範囲。NFKC で ～ は ~、－ は - になるが、〜・ー・−・– は変わらない。
// 区切りは、両側が数値のときだけ読む（名前の中のハイフンは、範囲にならない）。
const rangeSeparator = "(?:[~〜\\-ー−–]|から)";
const rangeToken = String.raw`${numericToken}(?:\s*${rangeSeparator}\s*${numericToken})?`;

// 「2本分」「100gくらい」「2本分位」「3cm程度」のような、単位のあとに付く語。
const amountSuffix = "(?:分)?(?:位|くらい|ぐらい|程度)?";

// 材料の量の単位。
const measureUnitToken =
	"大さじ|小さじ|カップ|パック|ひとつまみ|個|枚|本|袋|束|株|片|かけ|玉|丁|缶|瓶|切れ|房|合|kg|g|ml|l|cc|cm|つ|キログラム|ミリリットル|センチメートル|センチ|グラム|キロ|ミリ|リットル";

// 「人分」「倍」「量」は、他のレシピへのリンクの行で、リンク先の何回分を使うか（割合）を表す。
const unitToken = `人分|倍|(?<=\\d)量|${measureUnitToken}`;

// 行の終わりの分量にある漢数字（「一切れ」「大さじ二」「二〜三本」）。名前の中の漢数字（三つ葉・一味・二十日大根）は、
// 行の終わりが分量の形のときだけ読むので、対象にならない。
const kanjiRangeSource = `${kanjiNumberSource}(?:\\s*${rangeSeparator}\\s*${kanjiNumberSource})?`;
const kanjiAmountPatterns = [
	new RegExp(
		String.raw`^(?<head>.*?)(?<amount>(?:約\s*)?(?:大さじ|小さじ|カップ)\s*(?<number>${kanjiRangeSource})${amountSuffix})$`,
		"u",
	),
	new RegExp(
		String.raw`^(?<head>.*?)(?<amount>(?:約\s*)?(?<number>${kanjiRangeSource})\s*(?:${unitToken})${amountSuffix})$`,
		"iu",
	),
];

// 行の終わりの分量の漢数字だけを、半角の数字にする。読めるものがなければ、そのまま返す。
function convertKanjiAmount(text: string): string {
	for (const pattern of kanjiAmountPatterns) {
		const match = text.match(pattern);

		if (match?.groups) {
			const { head, amount, number } = match.groups;
			const converted = replaceKanjiNumbers(number);

			if (converted !== number) {
				return `${head}${amount.replace(number, converted)}`;
			}
		}
	}

	return text;
}

const measuredAmountPatterns = [
	new RegExp(
		String.raw`^(?<name>.+?)[\s:：]*(?<amount>(?:約\s*)?(?:大さじ|小さじ|カップ)\s*${rangeToken}${amountSuffix})$`,
		"iu",
	),
	new RegExp(
		String.raw`^(?<name>.+?)[\s:：]*(?<amount>(?:約\s*)?${rangeToken}\s*(?:${unitToken})${amountSuffix})$`,
		"iu",
	),
];

// 他のレシピへのリンクの行の、割合の言葉（「[[ドレッシング]] 半分」）。「1/2量」は、単位の「量」で読む。
const ratioWords: Record<string, number> = {
	半分: 0.5,
	半量: 0.5,
	全量: 1,
	全部: 1,
};

const ratioWordPattern = /^(?<name>.+?\]\])\s*(?<amount>半分|半量|全量|全部)$/u;

// 単位のない分数（「[[ドレッシング]] 1/3」）。割合として読む。
// 名前がリンクで終わる行だけ（ふつうの材料の「レタス 1/2」は、単位を補う側で読む）。
const bareFractionPattern = /^(?<name>.+?\]\])\s*(?<amount>\d+\/\d+)$/u;

// 数値にできない分量（「少々」「少し」「適量」など）。「とても少々」「ほんの少し」のような修飾も、分量に含める。
const descriptiveAmountPattern =
	/^(?<name>.+?)[\s:：]*(?<amount>お好みで\s*(?:少々|少し)|(?:とても|ほんの|ほんのちょっと|ちょっと|ごく)?\s*(?:少々|少し|少量|ちょっと)|適量|適宜|ひとつまみ|お好みで)$/u;

// カタカナ表記の単位を、既存の単位ラベルへ寄せる。amountText には原文の表記が残る。
const unitAliases: Record<string, string> = {
	センチ: "cm",
	センチメートル: "cm",
	グラム: "g",
	キロ: "kg",
	キログラム: "kg",
	ミリ: "ml",
	ミリリットル: "ml",
	リットル: "l",
};

const unitPattern = new RegExp(unitToken, "iu");
const quantityPattern = new RegExp(numericToken, "u");
const rangePattern = new RegExp(
	String.raw`${numericToken}\s*${rangeSeparator}\s*${numericToken}`,
	"u",
);

const rangeCapturePattern = new RegExp(
	String.raw`(?<min>${numericToken})\s*${rangeSeparator}\s*(?<max>${numericToken})`,
	"u",
);

export type AmountRange = { min: number; max: number };

// 分量の原文が範囲（「60~70g」「大さじ二〜三」）のとき、その下限と上限。範囲でなければ null。
// 材料の数量は、範囲を1つの数値にしない（null）。買い物で、上限を使って比べるために読む。
export function parseAmountRange(amountText: string): AmountRange | null {
	const match = convertKanjiAmount(amountText.normalize("NFKC")).match(
		rangeCapturePattern,
	);

	if (!match?.groups) {
		return null;
	}

	const first = parseNumericQuantity(match.groups.min);
	const second = parseNumericQuantity(match.groups.max);

	return { min: Math.min(first, second), max: Math.max(first, second) };
}

function parseNumericQuantity(value: string): number {
	const normalizedValue = value.trim().replace("と", " ");

	if (normalizedValue.includes(" ")) {
		const [wholeNumber, fraction] = normalizedValue.split(/\s+/u);
		const [numerator, denominator] = fraction.split("/").map(Number);

		return Number(wholeNumber) + numerator / denominator;
	}

	if (normalizedValue.includes("/")) {
		const [numerator, denominator] = normalizedValue.split("/").map(Number);

		return numerator / denominator;
	}

	return Number(normalizedValue);
}

function normalizeUnitLabel(unitLabel: string): string {
	const normalizedUnitLabel =
		unitAliases[unitLabel] ?? unitLabel.toLocaleLowerCase("ja-JP");

	switch (normalizedUnitLabel) {
		case "kg":
		case "g":
		case "ml":
		case "l":
		case "cc":
		case "cm":
			return normalizedUnitLabel;
		default:
			return unitLabel;
	}
}

function createParsedLine(
	rawText: string,
	name: string,
	amountText: string,
	// 分量のあとの括弧つきの補足（原文のまま分量に残す。数量には使わない）。
	supplement = "",
): ParsedIngredientLine {
	return {
		status: "parsed",
		rawText,
		name: name.trim(),
		amountText: `${amountText.trim()}${supplement}`,
		...readAmount(amountText),
	};
}

// 分量の文字から、数量と単位を読む。数量と単位は、漢数字を半角にした形で読む（原文の表記は、呼び出し側に残る）。
function readAmount(amountText: string): {
	quantity: number | null;
	unitLabel: string | null;
} {
	const readableAmount = convertKanjiAmount(amountText);
	const quantityMatch = readableAmount.match(quantityPattern);
	const unitMatch = readableAmount.match(unitPattern);

	return {
		// 範囲は1つの数値にしない。原文は amountText に残る。
		quantity:
			quantityMatch && !rangePattern.test(readableAmount)
				? parseNumericQuantity(quantityMatch[0])
				: null,
		unitLabel: unitMatch ? normalizeUnitLabel(unitMatch[0]) : null,
	};
}

// 行の終わりの、括弧つきの補足（「適量(色がつくくらい)」「1丁(300g)」）。
const trailingSupplementPattern = /^(?<body>.+?)(?<supplement>\s*\([^()]*\))$/u;

// 括弧の中身の全体が、1つの分量（「250g」「約250g」「1枚」「200~250g」「大さじ二」）か。
// 割合の単位（人分・倍・量）は、言い換えにしない（「(2人分)」は補足）。
const standaloneAmountPatterns = [
	new RegExp(
		String.raw`^(?:約\s*)?(?:大さじ|小さじ|カップ)\s*${rangeToken}${amountSuffix}$`,
		"iu",
	),
	new RegExp(
		String.raw`^(?:約\s*)?${rangeToken}\s*(?:${measureUnitToken})${amountSuffix}$`,
		"iu",
	),
];

export type AmountParts = {
	// 分量の本体（「1枚」）。
	main: string;
	// 行の終わりの、括弧つきの補足（「(250g)」「(木綿)」）。なければ null。
	supplement: string | null;
};

// 分量の原文を、本体と、括弧つきの補足に分ける。
export function splitAmountText(amountText: string): AmountParts {
	const match = amountText.match(trailingSupplementPattern);

	return match?.groups
		? {
				main: match.groups.body.trim(),
				supplement: match.groups.supplement.trim(),
			}
		: { main: amountText, supplement: null };
}

// 分量の言い換え（「1枚(250g)」の 250g）。範囲（「1枚(200~250g)」）なら、quantity は null で range を持つ。
export type AlternateAmount = {
	quantity: number | null;
	unitLabel: string | null;
	range: AmountRange | null;
};

// 分量の原文の、括弧つきの補足が、分量の言い換えなら、その数量と単位。補足でない・分量でなければ null。
export function parseAlternateAmount(
	amountText: string,
): AlternateAmount | null {
	const { supplement } = splitAmountText(amountText.normalize("NFKC"));

	if (supplement === null) {
		return null;
	}

	const content = supplement.slice(1, -1).trim();
	const readable = convertKanjiAmount(content);

	if (!standaloneAmountPatterns.some((pattern) => pattern.test(readable))) {
		return null;
	}

	const amount = readAmount(content);
	const range = parseAmountRange(content);

	return amount.quantity === null && range === null
		? null
		: { ...amount, range };
}

export function parseIngredientLine(
	input: string,
): ParsedIngredientLine | null {
	const rawText = input.trim();

	if (rawText.length === 0) {
		return null;
	}

	const normalizedText = rawText.normalize("NFKC");

	// 分量のあとに括弧つきの補足があるとき（「適量(…)」）は、補足を除いて分量を読み、補足は分量の原文に残す。
	// 括弧を除いても、分量が読めないとき（「ソーセージ(ベーコン)」など、名前の一部）は、行全体で読む。
	const supplementMatch = normalizedText.match(trailingSupplementPattern);

	if (supplementMatch?.groups) {
		const withoutSupplement = parseIngredientLine(supplementMatch.groups.body);

		if (withoutSupplement?.status === "parsed") {
			return createParsedLine(
				rawText,
				withoutSupplement.name,
				withoutSupplement.amountText,
				supplementMatch.groups.supplement.trim(),
			);
		}
	}

	// 分量の漢数字は、半角にして照合する（分量は行の終わりなので、前の部分は、そのまま同じ位置にある）。
	const matchText = convertKanjiAmount(normalizedText);

	for (const pattern of measuredAmountPatterns) {
		const match = matchText.match(pattern);

		if (match?.groups) {
			const amountStart = matchText.length - match.groups.amount.length;

			return createParsedLine(
				rawText,
				match.groups.name,
				normalizedText.slice(amountStart),
			);
		}
	}

	const ratioWordMatch = normalizedText.match(ratioWordPattern);

	if (ratioWordMatch?.groups) {
		return {
			status: "parsed",
			rawText,
			name: ratioWordMatch.groups.name.trim(),
			amountText: ratioWordMatch.groups.amount,
			quantity: ratioWords[ratioWordMatch.groups.amount],
			unitLabel: "量",
		};
	}

	const fractionMatch = normalizedText.match(bareFractionPattern);

	if (fractionMatch?.groups) {
		return createParsedLine(
			rawText,
			fractionMatch.groups.name,
			fractionMatch.groups.amount,
		);
	}

	const descriptiveMatch = normalizedText.match(descriptiveAmountPattern);

	if (descriptiveMatch?.groups) {
		return createParsedLine(
			rawText,
			descriptiveMatch.groups.name,
			descriptiveMatch.groups.amount,
		);
	}

	return {
		status: "missing-amount",
		rawText,
		name: normalizedText,
		amountText: null,
		quantity: null,
		unitLabel: null,
	};
}
