import { describe, expect, it } from "vitest";
import { findEmojiHits, findLexiconHits } from "./find-lexicon-hits";
import { innocentCookingPhrases } from "./lexicon/context-sensitive";
import { hardBlockEmoji } from "./lexicon/hard-block";
import type { LexiconEntry } from "./lexicon/types";
import { normalizeForModeration } from "./normalize-text";

// テストでは、実在する不適切な語ではなく、架空の語を使う（実際の語の一覧は、手元だけのファイルにある）。
const hardEntries: readonly LexiconEntry[] = [
	{ category: "harassment", terms: ["ぴよぴよ", "ふが"] },
];

const hard = (text: string) =>
	findLexiconHits(normalizeForModeration(text), hardEntries, {
		allowMask: true,
		hiraganaBoundary: true,
	});

describe("確定で弾く語（架空の語で確認）", () => {
	it.each([
		"ぴよぴよ",
		"ピヨピヨ",
		"ﾋﾟﾖﾋﾟﾖ",
		"ぴ よ ぴ よ",
		"ぴ.よ.ぴ.よ",
		"ぴ・よ・ぴ・よ",
		"ぴ\nよぴよ",
		"ぴ🙂よぴよ",
		"ぴ​よぴよ",
		"○よぴよ",
		"ぴ＊ぴよ",
		"お前のぴよぴよ",
	])("言い換え・伏せ字・区切りの挿入でも、見つかる（%s）", (text) => {
		expect(hard(text).length).toBeGreaterThan(0);
	});

	it("短いひらがなの語は、より長いひらがなの語の一部（両側がひらがな）なら、見つけない", () => {
		expect(hard("ふが！").length).toBeGreaterThan(0);
		expect(hard("ふがだ").length).toBeGreaterThan(0);
		expect(hard("もふがもふ")).toEqual([]);
		expect(hard("もふ\nがもふ")).toEqual([]);
	});

	it("レシピのグループの印（○☆）や、ふつうの文章は、見つけない", () => {
		expect(hard("○調味料\n酒 大さじ1")).toEqual([]);
		expect(hard("☆たれ\nみりん 大さじ1")).toEqual([]);
		expect(hard("ぴよ炒めに、ごま油をかける")).toEqual([]);
	});

	it("疑問符・三点リーダー・アンダーバーは、伏せ字として扱わない（「〜ますか？」が、語の一部に見えない）", () => {
		const entries: readonly LexiconEntry[] = [
			{ category: "sexual", terms: ["ますかき"] },
		];
		const find = (text: string) =>
			findLexiconHits(normalizeForModeration(text), entries, {
				allowMask: true,
			});

		expect(find("冷凍できますか？")).toEqual([]);
		expect(find("作れますか…")).toEqual([]);
		expect(find("ます_き")).toEqual([]);
		// 伏せ字の記号（○ など）は、これまでどおり
		expect(find("ます○き").length).toBeGreaterThan(0);
	});
});

describe("絵文字の組み合わせ", () => {
	it("すべて含まれていれば、見つける。1つだけでは、見つけない", () => {
		const find = (text: string) =>
			findEmojiHits(normalizeForModeration(text), hardBlockEmoji);

		expect(find("🍆とか💦とか").length).toBeGreaterThan(0);
		expect(find("🖕").length).toBeGreaterThan(0);
		expect(find("🍆を焼く🔥")).toEqual([]);
		expect(find("🍑のコンポート")).toEqual([]);
	});
});

describe("文脈で意味が変わる語（架空の語で確認）", () => {
	const contextEntries: readonly LexiconEntry[] = [
		{ category: "harassment", terms: ["ぽんぽこ", "さつ"] },
	];
	const context = (text: string, innocent: readonly string[] = []) =>
		findLexiconHits(normalizeForModeration(text), contextEntries, {
			innocentPhrases: innocent,
		}).map((hit) => hit.term);

	it("注意する語として、見つかる", () => {
		expect(context("これ、ぽんぽこだね")).toContain("ぽんぽこ");
	});

	it("レシピとして自然な言葉は、取り除いてから探す", () => {
		expect(context("さつまいもを蒸す")).toContain("さつ");
		expect(context("さつまいもを蒸す", ["さつまいも"])).not.toContain("さつ");
	});

	it("自然な言葉の一覧は、空ではない", () => {
		expect(innocentCookingPhrases.length).toBeGreaterThan(0);
	});
});
