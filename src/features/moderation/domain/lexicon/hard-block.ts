import type { LexiconEntry } from "./types";

// 【確定で弾く語】レシピでも、表示名でも、使う理由がない、明らかな語。1つでも含まれていれば、AI に聞かずに、公開できない。
// 語そのものは、リポジトリに入れず、手元だけの hard-block.local.ts に置く（あれば、ビルドに取り込む。なければ、空で、AI の判定だけになる）。
// 形式は、hard-block.example.ts を参照。増やすときは、調理の語や、地名・人名に含まれないことを確かめる（誤って弾くと、困るため）。
// 文脈によって、意味が変わる語は、ここではなく、context-sensitive.local.ts に置く。
export type EmojiCombination = {
	category: LexiconEntry["category"];
	emoji: readonly string[];
};

const localModules = import.meta.glob<{
	default: readonly LexiconEntry[];
	emojiCombinations?: readonly EmojiCombination[];
}>("./hard-block.local.ts", { eager: true });

export const hardBlockLexicon: readonly LexiconEntry[] = Object.values(
	localModules,
).flatMap((module) => module.default);

// 絵文字の組み合わせで、攻撃や性的な意味を表すもの（すべて含まれていれば、該当）。
const committedEmojiCombinations: readonly EmojiCombination[] = [
	{ category: "harassment", emoji: ["🖕"] },
	{ category: "sexual", emoji: ["🍆", "💦"] },
	{ category: "sexual", emoji: ["🍑", "🍆"] },
	{ category: "violence", emoji: ["🔪", "👤"] },
];

// 手元のファイルにある組み合わせ（差別などを表すもの）も、足す。
export const hardBlockEmoji: readonly EmojiCombination[] = [
	...committedEmojiCombinations,
	...Object.values(localModules).flatMap(
		(module) => module.emojiCombinations ?? [],
	),
];
