import * as kt from "../../../../kmp/shared/build/dist/js/productionLibrary/recipion-shared.mjs";

export const parseQuantityInput = (text: string): number | null =>
	kt.parseQuantity(text) ?? null;

// Kotlin の val は、{ get() } の形で書き出される。
export const kanjiNumberSource: string = kt.kanjiNumberSource.get();

export const kanjiNumberToDigits = (text: string): string | null =>
	kt.kanjiNumberToDigitsText(text) ?? null;

export const replaceKanjiNumbers = (text: string): string =>
	kt.replaceKanjiNumerals(text);

export function formatQuantity(
	value: number,
	options: { allowFractions?: boolean; grouping?: boolean } = {},
): string {
	return kt.formatQuantityText(
		value,
		options.allowFractions ?? true,
		options.grouping ?? true,
	);
}

export const formatQuantityForUnit = (
	value: number,
	unitLabel: string | null,
): string => kt.formatQuantityForUnitText(value, unitLabel);

type StockUnitCode = "count" | "g" | "ml";

export const formatStockAmount = (value: number, code: StockUnitCode): string =>
	kt.formatStockAmountPlain(value, code);

export type AmountDisplay = { texts: string[]; unitLabel: string | null };

export function formatAmounts(
	quantities: readonly number[],
	unitLabel: string | null,
	formatQuantityText: (quantity: number) => string,
	options: { grouping?: boolean } = {},
): AmountDisplay {
	const display = kt.formatAmountsText(
		[...quantities],
		unitLabel,
		formatQuantityText,
		options.grouping ?? true,
	);

	return { texts: [...display.texts], unitLabel: display.unitLabel ?? null };
}

export const formatAmountForUnit = (
	value: number,
	unitLabel: string | null,
): string => kt.formatAmountWithUnit(value, unitLabel);

export const formatStockAmountWithUnit = (
	value: number,
	code: StockUnitCode,
	label: string,
): string => kt.formatStockAmountText(value, code, label);

// 数と単位に分ける版は Kotlin 側にないため、単位の文字で分ける。
export function formatStockAmountParts(
	value: number,
	code: StockUnitCode,
	label: string,
): { amount: string; unitLabel: string } {
	const text = kt.formatStockAmountText(value, code, label);
	const match = /^(.*?)(kg|L|g|ml|cc|.*)$/u.exec(text);

	return { amount: match?.[1] ?? text, unitLabel: match?.[2] ?? label };
}
