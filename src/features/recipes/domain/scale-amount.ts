// 人数を変えたときの、材料の分量の丸め方（表示用）。買い物と「つくった」の数量は、丸めずに計算する。
import {
	type AmountRange,
	parseAmountRange,
} from "#/features/ingredients/domain/parse-ingredient-line";
import { describeAmount, describeAmountRange } from "./merge-recipe-needs";
import { weightedRatio } from "./scale-weight";

// 小数で表す単位。10以上は整数、10未満は小数第1位。
const smallDecimalUnits = new Set(["g", "ml", "cc"]);
// 大きな単位。小数第2位。
const largeDecimalUnits = new Set(["kg", "l"]);
// 数えるもの。1/2 刻み。
const countUnits = new Set([
	"個",
	"本",
	"枚",
	"玉",
	"片",
	"かけ",
	"丁",
	"缶",
	"瓶",
	"切れ",
	"房",
	"袋",
	"束",
	"株",
	"パック",
	"つ",
	"尾",
	"匹",
]);

function roundToStep(value: number, step: number): number {
	return Math.round(value / step) * step;
}

// 単位に合わせて丸める（0 にはしない。いちばん小さい刻みにする）。
export function roundScaledQuantity(
	value: number,
	unitLabel: string | null,
): number {
	const unit = unitLabel?.toLocaleLowerCase("ja-JP") ?? null;

	if (unit !== null && smallDecimalUnits.has(unit)) {
		return value >= 10
			? Math.round(value)
			: Math.max(0.1, Math.round(value * 10) / 10);
	}

	if (unit !== null && largeDecimalUnits.has(unit)) {
		return Math.max(0.01, Math.round(value * 100) / 100);
	}

	if (unit !== null && countUnits.has(unit)) {
		return roundToStep(value, 0.5) || 0.25;
	}

	// 大さじ・小さじ・カップ、そのほか：1/4 刻み（1/4 より少なければ 1/8）。
	return value < 0.25
		? Math.max(0.125, roundToStep(value, 0.125))
		: roundToStep(value, 0.25);
}

function isRounded(value: number, rounded: number): boolean {
	return Math.abs(value - rounded) > 1e-6;
}

// 割合を掛けた分量の表記。丸めで値が変わったときは「約」を付ける。
export function describeScaledAmount(
	quantity: number,
	unitLabel: string | null,
): string {
	const rounded = roundScaledQuantity(quantity, unitLabel);

	return `${isRounded(quantity, rounded) ? "約" : ""}${describeAmount(rounded, unitLabel)}`;
}

// 割合を掛けた範囲の分量の表記（「30~35g」）。
export function describeScaledAmountRange(
	range: AmountRange,
	unitLabel: string | null,
): string {
	const min = roundScaledQuantity(range.min, unitLabel);
	const max = roundScaledQuantity(range.max, unitLabel);
	const prefix =
		isRounded(range.min, min) || isRounded(range.max, max) ? "約" : "";

	return `${prefix}${describeAmountRange({ min, max }, unitLabel)}`;
}

// 材料の行に出す分量（割合が1なら、原文のまま）。数量にできない分量（少々・適量）も、原文のまま。
// 原文に括弧の補足（「1丁(300g)」）があれば、計算した分量のあとに、元の分量を添える。
export function scaleIngredientAmountText(
	item: {
		quantity: number | null;
		unitLabel: string | null;
		amountText: string | null;
		range?: AmountRange;
		scaleWeight?: number;
	},
	baseRatio: number,
): string | null {
	const { amountText } = item;
	// 材料ごとの増減のしかた（やや控えめ・固定など）を掛けた割合。
	const ratio = weightedRatio(baseRatio, item.scaleWeight);

	if (ratio === 1 || amountText === null) {
		return amountText;
	}

	const range = item.range ?? parseAmountRange(amountText);
	const scaled =
		item.quantity !== null
			? describeScaledAmount(item.quantity * ratio, item.unitLabel)
			: range
				? describeScaledAmountRange(
						{ min: range.min * ratio, max: range.max * ratio },
						item.unitLabel,
					)
				: null;

	if (scaled === null) {
		return amountText;
	}

	return /[(（]/u.test(amountText) ? `${scaled}（元：${amountText}）` : scaled;
}
