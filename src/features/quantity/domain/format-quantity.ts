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

// 在庫の g・ml の量の丸め（10 以上は整数、それ未満は小数第1位まで。333.333g → 333g）。
function roundMeasuredStockAmount(value: number): number {
	return value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
}

/**
 * 在庫の単位での数量を、読みやすく丸めて表す。個数は分数（1/3）、分数にならなければ小数第1位まで（1.818182個 → 1.8個）。
 * g・ml は丸める（10 以上は整数、それ未満は小数第1位まで。333.333g → 333g）。
 */
export function formatStockAmount(
	value: number,
	stockUnitCode: "count" | "g" | "ml",
): string {
	if (stockUnitCode === "count") {
		const text = formatQuantity(value);

		return text.includes(".")
			? formatQuantity(Math.round(value * 10) / 10, { allowFractions: false })
			: text;
	}

	return formatQuantity(roundMeasuredStockAmount(value), {
		allowFractions: false,
	});
}

// 表示で、大きい量に使う単位（g → kg、ml・cc → L）。保存・計算・入力欄の単位は、変えない。
const largerDisplayUnits: Record<string, string> = {
	g: "kg",
	ml: "L",
	cc: "L",
};
const largerDisplayUnitFactor = 1000;

// 大きい単位での数の書き方。元の単位の書き方（小数6桁まで）を 1000 で割っても、桁を失わないよう、9桁まで。
const largerUnitFormatters = {
	grouped: new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 9 }),
	plain: new Intl.NumberFormat("ja-JP", {
		maximumFractionDigits: 9,
		useGrouping: false,
	}),
};

export type AmountDisplay = {
	// 量ごとの数の文字（範囲なら、下限と上限）。
	texts: string[];
	// 表示する単位（切り替えたら kg・L。単位がなければ null）。
	unitLabel: string | null;
};

/**
 * 量を表示するときの、数の文字と単位。1,000g 以上は kg、1,000ml・1,000cc 以上は L にする
 * （1000 で割るだけで、丸めない。1,234g → 1.234kg）。それ以外の単位と、1,000 未満は、そのまま。
 * 複数の量（範囲の両端）は、すべてが 1,000 以上のときだけ、そろえて切り替える（単位を混ぜない）。
 * formatQuantityText は、切り替えないときの数の書き方（それぞれの画面の、今までの書き方）。
 * 入力欄に入れる文字には、使わない（入力した単位のまま編集できるように）。
 */
export function formatAmounts(
	quantities: readonly number[],
	unitLabel: string | null,
	formatQuantityText: (quantity: number) => string,
	options: { grouping?: boolean } = {},
): AmountDisplay {
	const largerUnit = unitLabel
		? largerDisplayUnits[unitLabel.normalize("NFKC").toLocaleLowerCase("ja-JP")]
		: undefined;
	const canSwitch =
		largerUnit !== undefined &&
		quantities.length > 0 &&
		quantities.every(
			(quantity) =>
				Number.isFinite(quantity) &&
				Math.abs(quantity) >= largerDisplayUnitFactor,
		);

	if (!canSwitch) {
		return { texts: quantities.map(formatQuantityText), unitLabel };
	}

	const formatter =
		options.grouping === false
			? largerUnitFormatters.plain
			: largerUnitFormatters.grouped;

	return {
		texts: quantities.map((quantity) =>
			formatter.format(quantity / largerDisplayUnitFactor),
		),
		unitLabel: largerUnit,
	};
}

/** 買うときの量を、数と単位の文字にする（「2個」「1/3本」「1.5kg」）。 */
export function formatAmountForUnit(
	value: number,
	unitLabel: string | null,
): string {
	const display = formatAmounts([value], unitLabel, (quantity) =>
		formatQuantityForUnit(quantity, unitLabel),
	);

	return `${display.texts.join("")}${display.unitLabel ?? ""}`;
}

/** 在庫の単位での量を、丸めて、数と単位に分ける（g・ml は丸めてから、kg・L に切り替える）。 */
export function formatStockAmountParts(
	value: number,
	stockUnitCode: "count" | "g" | "ml",
	stockUnitLabel: string,
): { amount: string; unitLabel: string } {
	if (stockUnitCode === "count") {
		return {
			amount: formatStockAmount(value, stockUnitCode),
			unitLabel: stockUnitLabel,
		};
	}

	const display = formatAmounts(
		[roundMeasuredStockAmount(value)],
		stockUnitLabel,
		(quantity) => formatQuantity(quantity, { allowFractions: false }),
	);

	return {
		amount: display.texts.join(""),
		unitLabel: display.unitLabel ?? stockUnitLabel,
	};
}

/** 在庫の単位での量を、丸めて、数と単位の文字にする（「約」は付けない。「1.234kg」「3個」）。 */
export function formatStockAmountWithUnit(
	value: number,
	stockUnitCode: "count" | "g" | "ml",
	stockUnitLabel: string,
): string {
	const { amount, unitLabel } = formatStockAmountParts(
		value,
		stockUnitCode,
		stockUnitLabel,
	);

	return `${amount}${unitLabel}`;
}
