import { describe, expect, it } from "vitest";
import { normalizeForModeration } from "./normalize-text";

describe("normalizeForModeration", () => {
	it.each([
		["ＡＢＣ　１２３", "abc 123"],
		["バカ", "ばか"],
		["ﾊﾞｶ", "ばか"],
		["ば​か", "ばか"],
	])("表記をそろえる（%s）", (input, expected) => {
		expect(normalizeForModeration(input).text).toBe(expected);
	});

	it("区切りの文字を除いた文章（compact）を作る。伏せ字の記号は残す", () => {
		expect(normalizeForModeration("ば.か").compact).toBe("ばか");
		expect(normalizeForModeration("ば か").compact).toBe("ばか");
		expect(normalizeForModeration("し・ね").compact).toBe("しね");
		expect(normalizeForModeration("○ね").compact).toBe("○ね");
		// 絵文字を挟んだ書き方も、区切りとして除く（絵文字そのものは、emoji に残る）
		expect(normalizeForModeration("ば🙂か").compact).toBe("ばか");
		expect(normalizeForModeration("ば🙂か").emoji).toBe("🙂");
	});

	it("絵文字だけを、順に取り出す", () => {
		expect(normalizeForModeration("あ🖕い🍆う💦").emoji).toBe("🖕🍆💦");
		expect(normalizeForModeration("ふつうの文章").emoji).toBe("");
		// 絵文字の連結（人物＋職業など）は、連結の文字が除かれ、部品ごとの絵文字として残る
		const sequence = normalizeForModeration("🫚🧑‍⚕️").emoji;

		expect(sequence).toContain("🫚");
		expect(sequence).toContain("⚕");
	});
});
