import type { LexiconEntry } from "./types";

// 【確定で弾く語】レシピでも、表示名でも、使う理由がない、明らかな語。1つでも含まれていれば、AI に聞かずに、公開できない。
// 増やすときは、調理の語や、地名・人名に含まれないことを確かめる（誤って弾くと、困るため）。
// 文脈によって、意味が変わる語は、ここではなく、context-sensitive.ts に置く。
export const hardBlockLexicon: readonly LexiconEntry[] = [
	{
		category: "violence",
		terms: [
			"死ね",
			"しね",
			"しねよ",
			"しねば",
			"氏ね",
			"市ね",
			"4ね",
			"死んで",
			"殺す",
			"ころす",
			"ぶっ殺",
			"殺してやる",
			"死ねばいい",
			"自殺しろ",
			"消えろ",
		],
	},
	{
		category: "sexual",
		terms: [
			"ちんこ",
			"ちんぽ",
			"まんこ",
			"セックス",
			"せっくす",
			"レイプ",
			"オナニー",
			"中出し",
			"フェラ",
			"エロ動画",
		],
	},
	{
		category: "discrimination",
		terms: ["きちがい", "キチガイ", "ガイジ", "がいじ", "池沼"],
	},
	{
		category: "harassment",
		terms: [
			"ゴミクズ",
			"クズ野郎",
			"うざすぎ",
			"きもすぎ",
			"ブサイク",
			"ぶさいく",
		],
	},
];

// 絵文字の組み合わせで、攻撃や性的な意味を表すもの（順に、すべて含まれていれば、該当）。
export const hardBlockEmoji: readonly {
	category: LexiconEntry["category"];
	emoji: readonly string[];
}[] = [
	{ category: "harassment", emoji: ["🖕"] },
	{ category: "sexual", emoji: ["🍆", "💦"] },
	{ category: "sexual", emoji: ["🍑", "🍆"] },
	{ category: "violence", emoji: ["🔪", "👤"] },
];
