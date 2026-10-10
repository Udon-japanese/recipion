// 評価用：1つの語から、すり抜けを試みる書き方（伏せ字・区切り・見えない文字・絵文字など）を、機械的に作る。
// 悪い語の「元になる語」だけを、手元のファイルに用意すれば、こちらで、書き換えのパターンを増やせる。

const separators = [".", " ", "・", "_", "-", "*", "/", "　", "​"];
const maskCharacters = ["○", "＊", "●", "×"];

function chars(text: string): string[] {
	return [...text];
}

function hiraganaToKatakana(text: string): string {
	return text.replace(/[ぁ-ゖ]/gu, (char) =>
		String.fromCharCode(char.charCodeAt(0) + 0x60),
	);
}

function toHalfwidthKatakanaApprox(text: string): string {
	// 半角カナは、正規化で、元に戻る。ここでは、全角カナにして、返す（半角カナの混入は、NFKC のテストで確認済み）。
	return hiraganaToKatakana(text);
}

export type Variant = { kind: string; text: string };

export function generateVariants(seed: string): Variant[] {
	const parts = chars(seed);
	const variants: Variant[] = [{ kind: "そのまま", text: seed }];

	for (const separator of separators) {
		variants.push({
			kind: `区切り（${separator === "​" ? "ゼロ幅" : separator}）`,
			text: parts.join(separator),
		});
	}

	for (const mask of maskCharacters) {
		for (let index = 0; index < parts.length; index += 1) {
			if (parts.length < 2) break;

			variants.push({
				kind: `伏せ字（${mask}）`,
				text: parts.map((part, i) => (i === index ? mask : part)).join(""),
			});
		}
	}

	variants.push(
		{ kind: "カタカナ", text: hiraganaToKatakana(seed) },
		{ kind: "カタカナ（全角）", text: toHalfwidthKatakanaApprox(seed) },
		{
			kind: "語尾の連続",
			text: `${seed}${parts.at(-1) ?? ""}${parts.at(-1) ?? ""}`,
		},
		{ kind: "絵文字を挟む", text: parts.join("🙂") },
		{ kind: "絵文字で囲む", text: `🔥${seed}🔥` },
		{
			kind: "大文字小文字・全角",
			text: seed.replace(/[a-z]/gu, (c) => c.toUpperCase()),
		},
	);

	return [
		...new Map(variants.map((variant) => [variant.text, variant])).values(),
	];
}

// レシピの文脈に、埋め込む（単独で書く、作り方の途中、材料の並びの中）。
export function embedInRecipeContext(
	text: string,
): { kind: string; text: string }[] {
	return [
		{ kind: "単独", text },
		{
			kind: "作り方の途中",
			text: `1. 玉ねぎを薄切りにする。\n2. ${text}\n3. 弱火で10分煮る。`,
		},
		{ kind: "材料の並び", text: `玉ねぎ 1個\n${text}\n塩 少々` },
	];
}
