import { describe, expect, it } from "vitest";
import {
	buildUnlistedShareText,
	buildUnlistedShareUrl,
	readPassphraseFromHash,
} from "./unlisted-share-link";

describe("限定公開の共有リンク", () => {
	it("パスフレーズは、クエリではなく、フラグメントに入る。読み戻すと、同じパスフレーズになる", () => {
		const url = new URL(
			buildUnlistedShareUrl(
				"https://recipion.app",
				"abc123",
				"ねこりんごやまくるま",
			),
		);

		expect(url.origin).toBe("https://recipion.app");
		expect(url.pathname).toBe("/recipes/abc123");
		expect(url.search).toBe("");
		expect(readPassphraseFromHash(url.hash)).toBe("ねこりんごやまくるま");
	});

	it.each([
		["", null],
		["#", null],
		["#p=", null],
		["#p=%20", null],
		["#other=1", null],
		["#p=%E3%81%AD%E3%81%93", "ねこ"],
		["p=ねこ", "ねこ"],
	])("フラグメントから読む（%s）", (hash, expected) => {
		expect(readPassphraseFromHash(hash)).toBe(expected);
	});

	// リンクのあとに、添えた文までまとめて貼られたとき（文がフラグメントの続きになる）。
	it.each([
		// Chrome のアドレスバーは、貼った改行を詰める（区切りがなくなる）
		["区切りなし", ""],
		["空白", " "],
		["改行", "\n"],
		["全角の空白", "　"],
	])("パスフレーズのあとに続く文は、捨てる（%s）", (_label, separator) => {
		const pasted = `てんしくりだしさけ${separator}レシピ「限定公開レシピ･:* .\\(( °ω° ))/.: 」（限定公開）${separator}パスフレーズ：てんしくりだしさけ`;

		expect(readPassphraseFromHash(`#p=${encodeURIComponent(pasted)}`)).toBe(
			"てんしくりだしさけ",
		);
	});

	it("リンクと文を、まとめてアドレスバーに貼ったときの形（エンコードされていない文がつながる）", () => {
		const hash = `#p=${encodeURIComponent("てんしくりだしさけ")}レシピ「限定公開レシピ･:*+.\\(( °ω° ))/.:+」（限定公開）パスフレーズ：てんしくりだしさけ`;

		expect(readPassphraseFromHash(hash)).toBe("てんしくりだしさけ");
	});

	it("添える文に、レシピ名とパスフレーズが入る", () => {
		const text = buildUnlistedShareText("肉じゃが", "ねこりんご");

		expect(text).toContain("肉じゃが");
		expect(text).toContain("パスフレーズ：ねこりんご");
	});
});
