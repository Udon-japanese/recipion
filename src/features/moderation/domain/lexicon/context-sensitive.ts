import type { LexiconEntry } from "./types";

// 【文脈によって、意味が変わる語】単独では、弾かない。AI の判定に「注意する語」として渡し、AI が怪しいと見たときの、見分けにも使う。
// 語そのものは、リポジトリに入れず、手元だけの context-sensitive.local.ts に置く（あれば、ビルドに取り込む。なければ、空）。
const localModules = import.meta.glob<{
	default: readonly LexiconEntry[];
	hintEmoji?: readonly string[];
}>("./context-sensitive.local.ts", { eager: true });

export const contextSensitiveLexicon: readonly LexiconEntry[] = Object.values(
	localModules,
).flatMap((module) => module.default);

// 単独でも、意味を持ちうる絵文字（AI への「注意する語」にする。単独では、止めない）。
export const contextHintEmoji: readonly string[] = Object.values(
	localModules,
).flatMap((module) => module.hintEmoji ?? []);

// 上の語を含んでいても、レシピとして自然な言葉（これを取り除いてから、語を探す）。
// 食材・料理名・調理の語を、書き足していく。
export const innocentCookingPhrases: readonly string[] = [
	"殺菌",
	"除菌",
	"殺虫",
	"血抜き",
	"血合い",
	"血の気",
	"死に水",
	"ぶっかけうどん",
	"ぶっかけそば",
	"ぶっかけ飯",
	"ぶっかけ素麺",
	"ぶっかけご飯",
	"ぶっかけ丼",
	"裸麦",
	"はだか麦",
	"裸電球",
	"素揚げ",
];
