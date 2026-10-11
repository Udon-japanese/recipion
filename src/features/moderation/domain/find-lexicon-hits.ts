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

// 照合のために、語を、あらかじめ、そろえておく（語が数千あっても、速く動かすため）。
type PreparedTerm = {
	// 一覧の中での順番（結果を、一覧の順に返すため）。
	order: number;
	term: string;
	category: LexiconCategory;
	chars: readonly string[];
	// 短いひらがなの語か（前後がひらがなの中の語を、除く対象）。
	isShortHiragana: boolean;
};

type PreparedLexicon = {
	// 先頭の文字 → その文字で始まる語。
	byFirstChar: ReadonlyMap<string, readonly PreparedTerm[]>;
	// 2文字以上の語すべて（先頭が伏せ字のとき、先頭の文字を問わず、探す）。
	maskableTerms: readonly PreparedTerm[];
};

const preparedCache = new WeakMap<readonly LexiconEntry[], PreparedLexicon>();

function prepareLexicon(entries: readonly LexiconEntry[]): PreparedLexicon {
	const cached = preparedCache.get(entries);

	if (cached) {
		return cached;
	}

	const byFirstChar = new Map<string, PreparedTerm[]>();
	const maskableTerms: PreparedTerm[] = [];
	let order = 0;

	for (const entry of entries) {
		for (const term of entry.terms) {
			const folded = foldTerm(term);

			if (folded === "") {
				continue;
			}

			const chars = [...folded];
			const prepared: PreparedTerm = {
				order: order++,
				term,
				category: entry.category,
				chars,
				isShortHiragana: hiraganaOnly.test(folded) && chars.length <= 3,
			};
			const first = chars[0] as string;
			const group = byFirstChar.get(first) ?? [];

			group.push(prepared);
			byFirstChar.set(first, group);

			if (chars.length >= 2) {
				maskableTerms.push(prepared);
			}
		}
	}

	const prepared = { byFirstChar, maskableTerms };

	preparedCache.set(entries, prepared);

	return prepared;
}

// text の index から、語と同じ長さの文字列が、一致するか（伏せ字は、1文字まで、何にでも一致）。
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

function isInsideHiragana(
	text: readonly string[],
	index: number,
	length: number,
): boolean {
	const before = text[index - 1];
	const after = text[index + length];

	return (
		before !== undefined &&
		hiraganaChar.test(before) &&
		after !== undefined &&
		hiraganaChar.test(after)
	);
}

const foldedPhraseCache = new WeakMap<readonly string[], string[]>();

function removeInnocentPhrases(
	candidate: string,
	innocentPhrases: readonly string[],
): string {
	if (innocentPhrases.length === 0) {
		return candidate;
	}

	let folded = foldedPhraseCache.get(innocentPhrases);

	if (!folded) {
		folded = innocentPhrases.map(foldTerm).filter((phrase) => phrase !== "");
		foldedPhraseCache.set(innocentPhrases, folded);
	}

	let result = candidate;

	for (const phrase of folded) {
		if (result.includes(phrase)) {
			result = result.split(phrase).join(" ");
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
	const prepared = prepareLexicon(entries);
	const allowMask = options.allowMask === true;
	const innocent = options.innocentPhrases ?? [];
	// 文字の配列に直す作業は、1回だけ行う。
	const candidates = [normalized.text, normalized.compact].map((candidate) => [
		...removeInnocentPhrases(candidate, innocent),
	]);
	const found = new Set<PreparedTerm>();

	function test(
		text: readonly string[],
		index: number,
		term: PreparedTerm,
	): void {
		if (found.has(term) || !matchesAt(text, index, term.chars, allowMask)) {
			return;
		}

		if (
			options.hiraganaBoundary === true &&
			term.isShortHiragana &&
			isInsideHiragana(text, index, term.chars.length)
		) {
			return;
		}

		found.add(term);
	}

	for (const text of candidates) {
		for (let index = 0; index < text.length; index += 1) {
			const char = text[index] as string;

			for (const term of prepared.byFirstChar.get(char) ?? []) {
				test(text, index, term);
			}

			// 先頭が伏せ字のとき（「○ね」）は、先頭の文字を問わず、探す。
			if (allowMask && isMaskCharacter(char)) {
				for (const term of prepared.maskableTerms) {
					test(text, index, term);
				}
			}
		}
	}

	// 一覧の順に、返す。
	return [...found]
		.sort((a, b) => a.order - b.order)
		.map(({ term, category }) => ({ term, category }));
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
