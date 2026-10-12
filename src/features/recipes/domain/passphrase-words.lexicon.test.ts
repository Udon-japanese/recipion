import { describe, expect, it } from "vitest";
import { contextSensitiveLexicon } from "#/features/moderation/domain/lexicon/context-sensitive";
import { hardBlockLexicon } from "#/features/moderation/domain/lexicon/hard-block";
import { normalizeForModeration } from "#/features/moderation/domain/normalize-text";
import {
	findContainingTerms,
	findSpanningViolations,
} from "./passphrase-safety";
import { passphraseWords } from "./passphrase-words";

// 語の一覧（確定・文脈）のうち、ひらがなだけの語（かな違いは、正規化でそろえる）。
const hiraganaTerms = [...hardBlockLexicon, ...contextSensitiveLexicon]
	.flatMap((entry) => entry.terms)
	.map((term) => normalizeForModeration(term).compact)
	.filter((term) => /^[ぁ-ゖ]{2,}$/u.test(term));

describe("passphraseWords と語の一覧", () => {
	it("語の中にも、語の境界をまたいでも、禁止語が成立しない", () => {
		expect(findContainingTerms(passphraseWords, hiraganaTerms)).toEqual([]);
		expect(findSpanningViolations(passphraseWords, hiraganaTerms)).toEqual([]);
	});
});
