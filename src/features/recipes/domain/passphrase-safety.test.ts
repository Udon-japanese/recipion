import { describe, expect, it } from "vitest";
import {
	findContainingTerms,
	findSpanningViolations,
} from "./passphrase-safety";

describe("findSpanningViolations", () => {
	it("語の境界をまたいで禁止語ができる組み合わせを見つける（2語・3語）", () => {
		// 実在の禁止語は使わず、架空の語で確かめる。
		const found = findSpanningViolations(
			["あぴよ", "ぴよ", "よぴ", "ねこ"],
			["よぴよぴ"],
		);

		expect(found).toHaveLength(1);
		expect(found[0]?.words.join("")).toContain("よぴよぴ");
		// 2語にまたがる（語の末尾 + 語の先頭）。
		expect(findSpanningViolations(["あぴ", "よぴ"], ["ぴよ"])).toEqual([
			{ term: "ぴよ", words: ["あぴ", "よぴ"] },
		]);
	});

	it("1つの語の中だけで成立するもの・またがらないものは、見つけない", () => {
		expect(findSpanningViolations(["ぴよぴよ", "ねこ"], ["ぴよ"])).toEqual([]);
		expect(findSpanningViolations(["ねこ", "いぬ"], ["ぴよ"])).toEqual([]);
	});
});

describe("findContainingTerms", () => {
	it("語の中に禁止語が入っていれば見つける", () => {
		expect(findContainingTerms(["あぴよい", "ねこ"], ["ぴよ"])).toEqual([
			{ word: "あぴよい", term: "ぴよ" },
		]);
	});
});
