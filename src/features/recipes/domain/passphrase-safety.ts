// 単語をつなげたときに、語の境界をまたいで、禁止語（hiragana）が成立しないかの検査。
// 全組み合わせを作らずに、禁止語ごとに「語の末尾 + 語まるごと(0個以上) + 語の先頭」に分けられるかを調べる（厳密。語の並びや重複の制約は無視するので、安全側）。

export type SpanningViolation = {
	term: string;
	// 禁止語を作る語の並び（先頭は語の末尾、最後は語の先頭が使われる）。
	words: string[];
};

function findSpanning(term: string, words: readonly string[]): string[] | null {
	// 位置 i まで（term の前半）が、ある語の末尾になっているか → その語。
	const suffixOwner = new Map<number, string>();

	for (let i = 1; i < term.length; i += 1) {
		const head = term.slice(0, i);
		const owner = words.find((word) => word.endsWith(head));

		if (owner) {
			suffixOwner.set(i, owner);
		}
	}

	const wholeWordsAt = (from: number): [number, string][] =>
		words
			.filter((word) => term.startsWith(word, from))
			.map((word): [number, string] => [from + word.length, word]);

	// 深さ優先で、境界を進める。
	const search = (position: number, used: string[]): string[] | null => {
		const rest = term.slice(position);
		const prefixOwner = words.find((word) => word.startsWith(rest));

		if (prefixOwner && used.length > 0) {
			return [...used, prefixOwner];
		}

		for (const [next, word] of wholeWordsAt(position)) {
			if (next < term.length) {
				const found = search(next, [...used, word]);

				if (found) return found;
			}
		}

		return null;
	};

	for (const [position, owner] of suffixOwner) {
		const found = search(position, [owner]);

		if (found) return found;
	}

	return null;
}

export function findSpanningViolations(
	words: readonly string[],
	terms: readonly string[],
): SpanningViolation[] {
	const violations: SpanningViolation[] = [];

	for (const term of new Set(terms)) {
		const found = findSpanning(term, words);

		if (found) {
			violations.push({ term, words: found });
		}
	}

	return violations;
}

// 語そのものに、禁止語が含まれていないか（語の中に、1つ入っている場合）。
export function findContainingTerms(
	words: readonly string[],
	terms: readonly string[],
): { word: string; term: string }[] {
	return words.flatMap((word) =>
		terms.filter((term) => word.includes(term)).map((term) => ({ word, term })),
	);
}
