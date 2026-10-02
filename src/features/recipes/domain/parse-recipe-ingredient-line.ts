export type ParsedRecipeIngredientLine =
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

// 「60~70g」「大さじ4〜5」のような範囲。NFKC で ～ は ~ になるが 〜 は変わらない。
const rangeSeparator = "[~〜]";
const rangeToken = String.raw`${numericToken}(?:\s*${rangeSeparator}\s*${numericToken})?`;

// 「2本分」「100gくらい」「2本分位」「3cm程度」のような、単位のあとに付く語。
const amountSuffix = "(?:分)?(?:位|くらい|ぐらい|程度)?";

const unitToken =
	"大さじ|小さじ|カップ|パック|ひとつまみ|個|枚|本|袋|束|株|片|かけ|玉|丁|缶|瓶|切れ|房|合|kg|g|ml|l|cc|cm|つ";

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

const descriptiveAmountPattern =
	/^(?<name>.+?)[\s:：]*(?<amount>お好みで\s*少々|適量|少々|ひとつまみ|お好みで)$/u;

const unitPattern = new RegExp(unitToken, "iu");
const quantityPattern = new RegExp(numericToken, "u");
const rangePattern = new RegExp(
	String.raw`${numericToken}\s*${rangeSeparator}\s*${numericToken}`,
	"u",
);

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
	const normalizedUnitLabel = unitLabel.toLocaleLowerCase("ja-JP");

	switch (normalizedUnitLabel) {
		case "kg":
		case "g":
		case "ml":
		case "l":
		case "cc":
			return normalizedUnitLabel;
		default:
			return unitLabel;
	}
}

function createParsedLine(
	rawText: string,
	name: string,
	amountText: string,
): ParsedRecipeIngredientLine {
	const quantityMatch = amountText.match(quantityPattern);
	const unitMatch = amountText.match(unitPattern);

	return {
		status: "parsed",
		rawText,
		name: name.trim(),
		amountText: amountText.trim(),
		// 範囲は1つの数値にしない。原文は amountText に残る。
		quantity:
			quantityMatch && !rangePattern.test(amountText)
				? parseNumericQuantity(quantityMatch[0])
				: null,
		unitLabel: unitMatch ? normalizeUnitLabel(unitMatch[0]) : null,
	};
}

export function parseRecipeIngredientLine(
	input: string,
): ParsedRecipeIngredientLine | null {
	const rawText = input.trim();

	if (rawText.length === 0) {
		return null;
	}

	const normalizedText = rawText.normalize("NFKC");

	for (const pattern of measuredAmountPatterns) {
		const match = normalizedText.match(pattern);

		if (match?.groups) {
			return createParsedLine(rawText, match.groups.name, match.groups.amount);
		}
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
