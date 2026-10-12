import { findLexiconHits } from "./find-lexicon-hits";
import { contextSensitiveLexicon } from "./lexicon/context-sensitive";
import { hardBlockLexicon } from "./lexicon/hard-block";
import type { LexiconEntry } from "./lexicon/types";
import { normalizeForModeration } from "./normalize-text";

// 語の一覧に、1つでも当たるか（厳しめの判定。ひらがなの境界の例外を使わない）。
// 自動で作る文字列（限定公開のパスフレーズなど）が、不適切な語になっていないかの確認に使う。
export function containsLexiconTerm(
	text: string,
	lexicons: readonly LexiconEntry[][] = [
		[...hardBlockLexicon],
		[...contextSensitiveLexicon],
	],
): boolean {
	const normalized = normalizeForModeration(text);

	return lexicons.some(
		(entries) =>
			findLexiconHits(normalized, entries, { allowMask: true }).length > 0,
	);
}
