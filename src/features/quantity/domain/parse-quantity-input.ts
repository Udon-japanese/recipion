// 数量の入力（「1/2」「1と1/2」「1 1/2」「1½」「0.5」「½」）を、数値にする。読めなければ null。
// 全角の数字・スラッシュは、NFKC で、半角に直してから読む。
// 「½」などの1文字の分数。「1½」（＝1 1/2）を正しく読むため、NFKC の前に、「 1/2」へ直す
// （NFKC だけだと、「1½」は「11/2」になってしまう）。
const vulgarFractions: Record<string, string> = {
	"½": " 1/2",
	"⅓": " 1/3",
	"⅔": " 2/3",
	"¼": " 1/4",
	"¾": " 3/4",
	"⅛": " 1/8",
};

export function parseQuantityInput(text: string): number | null {
	const normalized = text
		.replace(
			/[½⅓⅔¼¾⅛]/gu,
			(character) => vulgarFractions[character] ?? character,
		)
		.normalize("NFKC")
		// NFKC は、「½」を「1⁄2」（分数のスラッシュ）にするため、通常のスラッシュに直す。
		.replace(/⁄/gu, "/")
		.trim();

	if (normalized.length === 0) {
		return null;
	}

	// 桁区切りの「1,000」は、「1000」として読む。
	if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/u.test(normalized)) {
		return round(Number(normalized.replaceAll(",", "")));
	}

	// 帯分数：「1 1/2」「1と1/2」
	const mixed = /^(\d+)(?:\s+|と)(\d+)\/(\d+)$/u.exec(normalized);

	if (mixed) {
		const denominator = Number(mixed[3]);

		return denominator === 0
			? null
			: round(Number(mixed[1]) + Number(mixed[2]) / denominator);
	}

	// 分数：「1/2」
	const fraction = /^(\d+)\/(\d+)$/u.exec(normalized);

	if (fraction) {
		const denominator = Number(fraction[2]);

		return denominator === 0 ? null : round(Number(fraction[1]) / denominator);
	}

	// 小数・整数：「0.5」「.5」「3」
	if (/^(?:\d+(?:\.\d+)?|\.\d+)$/u.test(normalized)) {
		return round(Number(normalized));
	}

	return null;
}

function round(value: number): number {
	return Number(value.toFixed(6));
}
