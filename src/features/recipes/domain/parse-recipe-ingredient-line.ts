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

const numericToken = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)`;

const unitToken =
	"大さじ|小さじ|カップ|パック|ひとつまみ|個|枚|本|袋|束|株|片|かけ|玉|丁|缶|瓶|切れ|房|合|kg|g|ml|l|cc";

const measuredAmountPatterns = [
	new RegExp(
		String.raw`^(?<name>.+?)[\s:：]*(?<amount>(?:約\s*)?(?:大さじ|小さじ|カップ)\s*${numericToken})$`,
		"iu",
	),
	new RegExp(
		String.raw`^(?<name>.+?)[\s:：]*(?<amount>(?:約\s*)?${numericToken}\s*(?:${unitToken}))$`,
		"iu",
	),
];

const descriptiveAmountPattern =
	/^(?<name>.+?)[\s:：]*(?<amount>適量|少々|ひとつまみ|お好みで)$/u;

const unitPattern = new RegExp(unitToken, "iu");
const quantityPattern = new RegExp(numericToken, "u");

function parseNumericQuantity(value: string): number {
	const normalizedValue = value.trim();

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
		quantity: quantityMatch ? parseNumericQuantity(quantityMatch[0]) : null,
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
