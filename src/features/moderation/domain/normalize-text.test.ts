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
	});

	it("絵文字だけを、順に取り出す", () => {
		expect(normalizeForModeration("あ🖕い🍆う💦").emoji).toBe("🖕🍆💦");
		expect(normalizeForModeration("ふつうの文章").emoji).toBe("");
	});
});
