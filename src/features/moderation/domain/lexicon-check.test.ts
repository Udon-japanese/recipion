import { describe, expect, it } from "vitest";
import { containsLexiconTerm } from "./lexicon-check";

// 実在する語は使わず、架空の語で確かめる。
const lexicons = [[{ category: "violence" as const, terms: ["ぴよぴよ"] }]];

describe("containsLexiconTerm", () => {
	it("語が含まれていれば true。前後が別の語でも、当たる（厳しめ）", () => {
		expect(containsLexiconTerm("ねこぴよぴよいぬ", lexicons)).toBe(true);
		expect(containsLexiconTerm("ねこいぬ", lexicons)).toBe(false);
	});
});
