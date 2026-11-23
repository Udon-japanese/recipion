import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import * as ts from "../domain/format-quantity";
import { replaceKanjiNumbers } from "../domain/kanji-numeral";
import { parseQuantityInput } from "../domain/parse-quantity-input";
import * as kt from "./kotlin-quantity";

function createRandom(seed: number) {
	let state = seed;

	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;

		return state / 4294967296;
	};
}

const random = createRandom(20261122);
const pieces = [
	"0",
	"1",
	"2",
	"3",
	"9",
	".",
	",",
	"/",
	" ",
	"と",
	"½",
	"¼",
	"１",
	"／",
	"一",
	"二",
	"十",
	"半",
	"分の",
	"-",
	"a",
];
const units = [null, "g", "kg", "ml", "mL", "L", "cc", "個", "本", "切れ"];

const texts = Array.from({ length: 20000 }, () =>
	Array.from(
		{ length: 1 + Math.floor(random() * 6) },
		() => pieces[Math.floor(random() * pieces.length)],
	).join(""),
);
const numbers = [
	...Array.from(
		{ length: 20000 },
		() => (random() - 0.2) * 10 ** Math.floor(random() * 7),
	),
	...Array.from({ length: 2000 }, () => Math.floor(random() * 5000) / 8),
	...Array.from({ length: 2000 }, () => Math.floor(random() * 3000) / 3),
	0,
	-0,
	0.5,
	1.005,
	2.5,
	999.5,
	999.9999999,
	1e-7,
	-1e-7,
	123456789.12345679,
];

describe("Kotlin/JS の quantity と TS 版の一致", () => {
	it("分量の読み取り・漢数字の置き換え", () => {
		const differences = texts.filter(
			(text) =>
				kt.parseQuantityInput(text) !== parseQuantityInput(text) ||
				kt.replaceKanjiNumbers(text) !== replaceKanjiNumbers(text),
		);

		expect(differences.slice(0, 10)).toEqual([]);
	});

	it("数量の表示", () => {
		const differences: string[] = [];

		for (const value of numbers) {
			for (const unit of units) {
				const pairs: [string, string][] = [
					[kt.formatQuantity(value), ts.formatQuantity(value)],
					[
						kt.formatQuantity(value, {
							grouping: false,
							allowFractions: false,
						}),
						ts.formatQuantity(value, {
							grouping: false,
							allowFractions: false,
						}),
					],
					[
						kt.formatAmountForUnit(value, unit),
						ts.formatAmountForUnit(value, unit),
					],
				];

				if (value >= 0) {
					pairs.push([
						kt.formatStockAmountWithUnit(value, "g", "g"),
						ts.formatStockAmountWithUnit(value, "g", "g"),
					]);
					pairs.push([
						kt.formatStockAmountWithUnit(value, "count", "個"),
						ts.formatStockAmountWithUnit(value, "count", "個"),
					]);
				}

				for (const [kotlin, typescript] of pairs) {
					if (kotlin !== typescript) {
						differences.push(
							`${value} ${unit}: kotlin=${kotlin} ts=${typescript}`,
						);
					}
				}
			}
		}

		expect(differences.slice(0, 10)).toEqual([]);
	});

	it("TS 版の答えを、JVM のテスト用に書き出す", () => {
		const parse = texts.map((text) => [
			text,
			parseQuantityInput(text),
			replaceKanjiNumbers(text),
		]);
		const format = numbers.flatMap((value) =>
			units.map((unit) => [
				value,
				unit,
				ts.formatQuantity(value),
				ts.formatAmountForUnit(value, unit),
			]),
		);

		writeFileSync(
			`${process.cwd()}/kmp/shared/build/ts-answers.json`,
			JSON.stringify({ parse, format }, (_key, value) =>
				Object.is(value, -0) ? "-0" : value,
			),
		);
	});
});
