const fractionDenominators = [2, 3, 4, 8] as const;

const groupedFormatter = new Intl.NumberFormat("ja-JP", {
	maximumFractionDigits: 6,
});

// 入力欄に入れるときは、桁区切りを付けない（そのまま編集できるように）。
const plainFormatter = new Intl.NumberFormat("ja-JP", {
	maximumFractionDigits: 6,
	useGrouping: false,
});

// 1/3 は、0.333333 で保存されるため、近い分数に戻す（許す誤差）。
const tolerance = 0.0001;

/**
 * 数量を、人が読みやすい形にする。小数部が、2・3・4・8分の1の分数に近ければ、分数で表す
 * （0.5 → 「1/2」、1.5 → 「1 1/2」）。それ以外は、小数。grouping が false のときは、桁区切りを付けない。
 */
export function formatQuantity(
	value: number,
	options: { allowFractions?: boolean; grouping?: boolean } = {},
): string {
	const { allowFractions = true, grouping = true } = options;
	const decimalFormatter = grouping ? groupedFormatter : plainFormatter;

	if (!allowFractions || !Number.isFinite(value)) {
		return decimalFormatter.format(value);
	}

	const whole = Math.floor(value + tolerance);
	const fractionPart = value - whole;

	if (Math.abs(fractionPart) < tolerance) {
		return decimalFormatter.format(whole);
	}

	for (const denominator of fractionDenominators) {
		const numerator = Math.round(fractionPart * denominator);

		if (
			numerator > 0 &&
			numerator < denominator &&
			Math.abs(fractionPart - numerator / denominator) < tolerance
		) {
			// 約分できる分数（2/4 など）は、小さい分母で先に見つかっているため、ここには来ない。
			return whole > 0
				? `${decimalFormatter.format(whole)} ${numerator}/${denominator}`
				: `${numerator}/${denominator}`;
		}
	}

	return decimalFormatter.format(value);
}

// 小数で表す単位（重さ・体積）。分数にはしない（1/2kg ではなく 0.5kg）。
const decimalUnits = new Set(["g", "kg", "ml", "l", "cc"]);

/**
 * 買うときの数量を、単位に合わせて表す。個・本・玉などは分数（1/3本）、g・kg・ml・l は小数。
 */
export function formatQuantityForUnit(
	value: number,
	unitLabel: string | null,
): string {
	return formatQuantity(value, {
		allowFractions:
			unitLabel === null ||
			!decimalUnits.has(unitLabel.toLocaleLowerCase("ja-JP")),
	});
}

/**
 * 在庫の単位での数量を、読みやすく丸めて表す。個数は分数（1/3）、g・ml は丸める
 * （10 以上は整数、それ未満は小数第1位まで。333.333g → 333g）。
 */
export function formatStockAmount(
	value: number,
	stockUnitCode: "count" | "g" | "ml",
): string {
	if (stockUnitCode === "count") {
		return formatQuantity(value);
	}

	const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;

	return formatQuantity(rounded, { allowFractions: false });
}
