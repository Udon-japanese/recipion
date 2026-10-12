import { passphraseWords } from "./passphrase-words";

// 限定公開のパスフレーズの語数。
export const passphraseWordCount = 4;

// 1時間に、同じユーザーが、同じレシピで、間違えてよい回数。超えたら、1時間は試せない。
export const maxPassphraseFailuresPerHour = 5;

export type RandomIndex = (size: number) => number;

// 語を、重複なく選んでつなげる。isAcceptable が false なら、選び直す（不適切な語になっていないかの確認用）。
export function generatePassphrase(
	randomIndex: RandomIndex,
	isAcceptable: (passphrase: string) => boolean = () => true,
	words: readonly string[] = passphraseWords,
	wordCount: number = passphraseWordCount,
): string {
	for (let attempt = 0; attempt < 50; attempt += 1) {
		const chosen: string[] = [];

		// 乱数が偏っていても、終わらなくならないよう、選ぶ回数に上限を置く。
		for (
			let tries = 0;
			chosen.length < wordCount && tries < wordCount * 50;
			tries += 1
		) {
			const word = words[randomIndex(words.length)];

			if (word !== undefined && !chosen.includes(word)) {
				chosen.push(word);
			}
		}

		if (chosen.length < wordCount) {
			continue;
		}

		const passphrase = chosen.join("");

		if (isAcceptable(passphrase)) {
			return passphrase;
		}
	}

	throw new Error("パスフレーズを作れませんでした");
}

// 入力されたパスフレーズを、そろえる（全角半角、カタカナ、空白・区切りの違いを、無視する）。
export function normalizePassphraseInput(input: string): string {
	return input
		.normalize("NFKC")
		.replace(/[ァ-ヶ]/gu, (char) =>
			String.fromCharCode(char.charCodeAt(0) - 0x60),
		)
		.replace(/[\s・,、。.\-_/]/gu, "");
}

// ロックするかの判定。失敗の時刻の一覧（直近1時間の分）から。
export function isPassphraseLocked(failuresInLastHour: number): boolean {
	return failuresInLastHour >= maxPassphraseFailuresPerHour;
}
