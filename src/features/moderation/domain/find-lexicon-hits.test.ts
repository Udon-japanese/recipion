import { describe, expect, it } from "vitest";
import { findEmojiHits, findLexiconHits } from "./find-lexicon-hits";
import {
	contextSensitiveLexicon,
	innocentCookingPhrases,
} from "./lexicon/context-sensitive";
import { hardBlockEmoji, hardBlockLexicon } from "./lexicon/hard-block";
import { normalizeForModeration } from "./normalize-text";

const hard = (text: string) =>
	findLexiconHits(normalizeForModeration(text), hardBlockLexicon, {
		allowMask: true,
		hiraganaBoundary: true,
	});

describe("確定で弾く語", () => {
	it.each([
		"死ね",
		"しね",
		"シネ",
		"ｼﾈ",
		"し ね",
		"し.ね",
		"し・ね",
		"し\nね",
		"氏ね",
		"4ね",
		"○ね",
		"お前はしねよ",
	])("言い換え・伏せ字・区切りの挿入でも、見つかる（%s）", (text) => {
		expect(hard(text).length).toBeGreaterThan(0);
	});

	it.each([
		"もやしねぎ炒め",
		"もやし ねぎを加える",
		"もやし\nねぎ 1本",
		"○調味料\n酒 大さじ1",
		"きのこの いしづき",
	])("ふつうのレシピの文章は、見つからない（%s）", (text) => {
		expect(hard(text)).toEqual([]);
	});

	it("絵文字の組み合わせを、見つける。1つだけでは、見つけない", () => {
		const find = (text: string) =>
			findEmojiHits(normalizeForModeration(text), hardBlockEmoji);

		expect(find("🍆とか💦とか").length).toBeGreaterThan(0);
		expect(find("🖕").length).toBeGreaterThan(0);
		expect(find("🍆を焼く🔥")).toEqual([]);
		expect(find("🍑のコンポート")).toEqual([]);
	});
});

describe("文脈で意味が変わる語", () => {
	const context = (text: string) =>
		findLexiconHits(normalizeForModeration(text), contextSensitiveLexicon, {
			innocentPhrases: innocentCookingPhrases,
		}).map((hit) => hit.term);

	it("注意する語として、見つかる", () => {
		expect(context("これ、くそうまい")).toContain("くそ");
		expect(context("ばかじゃないの")).toContain("ばか");
	});

	it("レシピとして自然な言葉は、取り除いてから探す", () => {
		expect(context("包丁で殺菌する")).not.toContain("殺");
		expect(context("鶏の血抜きをする")).not.toContain("血");
		expect(context("ぶっかけうどん")).not.toContain("ぶっかけ");
	});
});
