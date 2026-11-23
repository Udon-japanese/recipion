import { it } from "vitest";
import { formatAmountForUnit } from "../domain/format-quantity";
import { replaceKanjiNumbers } from "../domain/kanji-numeral";
import { parseQuantityInput } from "../domain/parse-quantity-input";
import * as kt from "./kotlin-quantity";

const inputs = [
	"1/2",
	"1と1/2",
	"１／４",
	"1½",
	"0.5",
	"300",
	"1,250.5",
	"abc",
	"大さじ",
	"二分の一",
	"十二",
];

function measure(label: string, run: (index: number) => unknown) {
	const iterations = 200_000;

	for (let index = 0; index < 20_000; index += 1) run(index);

	const samples: number[] = [];

	for (let round = 0; round < 5; round += 1) {
		const start = performance.now();

		for (let index = 0; index < iterations; index += 1) run(index);

		samples.push(((performance.now() - start) * 1000) / iterations);
	}

	samples.sort((a, b) => a - b);
	console.log(`${label}: ${samples[2]?.toFixed(3)} µs/回（中央値）`);
}

it("速さ", () => {
	measure("TS     parseQuantityInput", (i) =>
		parseQuantityInput(inputs[i % inputs.length] ?? ""),
	);
	measure("Kotlin parseQuantityInput", (i) =>
		kt.parseQuantityInput(inputs[i % inputs.length] ?? ""),
	);
	measure("TS     replaceKanjiNumbers", (i) =>
		replaceKanjiNumbers(inputs[i % inputs.length] ?? ""),
	);
	measure("Kotlin replaceKanjiNumbers", (i) =>
		kt.replaceKanjiNumbers(inputs[i % inputs.length] ?? ""),
	);
	measure("TS     formatAmountForUnit", (i) =>
		formatAmountForUnit((i % 3000) / 3, i % 2 ? "g" : "個"),
	);
	measure("Kotlin formatAmountForUnit", (i) =>
		kt.formatAmountForUnit((i % 3000) / 3, i % 2 ? "g" : "個"),
	);
}, 120_000);
