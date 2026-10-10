import type { LexiconCategory, LexiconEntry } from "./lexicon/types";
import {
	isMaskCharacter,
	type NormalizedText,
	normalizeForModeration,
} from "./normalize-text";

export type LexiconHit = {
	term: string;
	category: LexiconCategory;
};

type FindOptions = {
	// 伏せ字の記号（○ など）を、1文字だけ、何かの文字の代わりとして許す。
	allowMask?: boolean;
	// 上の語を含んでいても、レシピとして自然な言葉。取り除いてから探す。
	innocentPhrases?: readonly string[];
	// 短いひらがなの語は、より長いひらがなの語の一部（「もやしねぎ」の「しね」）を、除く。
	hiraganaBoundary?: boolean;
};

const hiraganaOnly = /^[ぁ-ゖー]+$/u;
const hiraganaChar = /[ぁ-ゖー]/u;

function foldTerm(term: string): string {
	return normalizeForModeration(term).compact;
}

// text の index から、term と同じ長さの文字列が、一致するか（伏せ字は、1文字まで、何にでも一致）。
function matchesAt(
	text: readonly string[],
	index: number,
	term: readonly string[],
	allowMask: boolean,
): boolean {
	let masked = 0;

	for (let offset = 0; offset < term.length; offset += 1) {
		const textChar = text[index + offset];

		if (textChar === term[offset]) {
			continue;
		}

		if (allowMask && textChar !== undefined && isMaskCharacter(textChar)) {
			masked += 1;

			if (masked > 1 || term.length < 2) {
				return false;
			}

			continue;
		}

		return false;
	}

	// 伏せ字だけで、一致したもの（元の文字が、1つも合っていない）は、除く。
	return masked < term.length;
}

function containsTerm(
	candidate: string,
	foldedTerm: string,
	options: FindOptions,
): boolean {
	const text = [...candidate];
	const term = [...foldedTerm];
	const applyBoundary =
		options.hiraganaBoundary === true &&
		hiraganaOnly.test(foldedTerm) &&
		term.length <= 3;

	for (let index = 0; index + term.length <= text.length; index += 1) {
		if (!matchesAt(text, index, term, options.allowMask === true)) {
			continue;
		}

		if (applyBoundary) {
			const before = text[index - 1];
			const after = text[index + term.length];
			const isInsideHiragana =
				before !== undefined &&
				hiraganaChar.test(before) &&
				after !== undefined &&
				hiraganaChar.test(after);

			if (isInsideHiragana) {
				continue;
			}
		}

		return true;
	}

	return false;
}

function removeInnocentPhrases(
	candidate: string,
	innocentPhrases: readonly string[],
): string {
	let result = candidate;

	for (const phrase of innocentPhrases) {
		const folded = foldTerm(phrase);

		if (folded !== "") {
			result = result.split(folded).join(" ");
		}
	}

	return result;
}

// 正規化した文章に、一覧の語が含まれるか。区切りを入れた文章と、区切りを除いた文章の、両方で探す。
export function findLexiconHits(
	normalized: NormalizedText,
	entries: readonly LexiconEntry[],
	options: FindOptions = {},
): LexiconHit[] {
	const innocent = options.innocentPhrases ?? [];
	const candidates = [normalized.text, normalized.compact].map((candidate) =>
		removeInnocentPhrases(candidate, innocent),
	);
	const hits: LexiconHit[] = [];

	for (const entry of entries) {
		for (const term of entry.terms) {
			const folded = foldTerm(term);

			if (folded === "") {
				continue;
			}

			if (
				candidates.some((candidate) => containsTerm(candidate, folded, options))
			) {
				hits.push({ term, category: entry.category });
			}
		}
	}

	return hits;
}

// 絵文字の組み合わせ（すべて含まれていれば、該当）。
export function findEmojiHits(
	normalized: NormalizedText,
	combinations: readonly {
		category: LexiconCategory;
		emoji: readonly string[];
	}[],
): LexiconHit[] {
	return combinations
		.filter((combination) =>
			combination.emoji.every((emoji) => normalized.emoji.includes(emoji)),
		)
		.map((combination) => ({
			term: combination.emoji.join(""),
			category: combination.category,
		}));
}
