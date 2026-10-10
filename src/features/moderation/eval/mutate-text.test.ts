import { describe, expect, it } from "vitest";
import { generateVariants } from "./mutate-text";

describe("generateVariants", () => {
	it("区切り・伏せ字・カタカナ・絵文字などの書き方を、重複なく作る", () => {
		const variants = generateVariants("ばか");
		const texts = variants.map((variant) => variant.text);

		expect(texts).toContain("ばか");
		expect(texts).toContain("ば.か");
		expect(texts).toContain("ば か");
		expect(texts).toContain("○か");
		expect(texts).toContain("ば＊");
		expect(texts).toContain("バカ");
		expect(texts).toContain("ば🙂か");
		expect(new Set(texts).size).toBe(texts.length);
	});

	it("書き換えても同じになる語（カタカナの語など）も、「そのまま」の種類を残す", () => {
		const variants = generateVariants("カス");

		expect(variants[0]).toEqual({ kind: "そのまま", text: "カス" });
		expect(variants.filter((variant) => variant.text === "カス")).toHaveLength(
			1,
		);
	});
});
