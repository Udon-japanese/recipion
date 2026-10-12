import { describe, expect, it } from "vitest";
import { generatePassphrase, normalizePassphraseInput } from "./passphrase";
import { passphraseWords } from "./passphrase-words";

describe("passphraseWords", () => {
	it("語は、重複のない、ひらがなの2〜5文字。語数は十分にある", () => {
		expect(new Set(passphraseWords).size).toBe(passphraseWords.length);
		expect(passphraseWords.length).toBeGreaterThanOrEqual(400);

		for (const word of passphraseWords) {
			expect(word).toMatch(/^[ぁ-ゖ]{2,5}$/u);
		}
	});
});

describe("generatePassphrase", () => {
	it("決まった数の語をつなげる。不適切と判定されたら、選び直す", () => {
		const words = ["あ", "い", "う", "え", "お"];
		let call = 0;
		const result = generatePassphrase(
			() => call++ % words.length,
			(passphrase) => passphrase !== "あいうえ",
			words,
			4,
		);

		expect(result).not.toBe("あいうえ");
		expect(result).toHaveLength(4);
	});

	it("どうしても通らなければ、例外", () => {
		expect(() =>
			generatePassphrase(
				() => 0,
				() => false,
				["あ", "い"],
				2,
			),
		).toThrow();
	});
});

describe("normalizePassphraseInput", () => {
	it("カタカナ・全角・空白・区切りの違いを吸収する", () => {
		expect(normalizePassphraseInput("ネコ りんご・ヤマ　くるま")).toBe(
			"ねこりんごやまくるま",
		);
	});
});
