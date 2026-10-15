import { describe, expect, it } from "vitest";
import {
	buildRecipeTips,
	formatRecipeTips,
	hasOnlyHeadings,
} from "./recipe-tips";

describe("recipe-tips", () => {
	it("使える機能の案内だけを返す", () => {
		expect(
			buildRecipeTips({ canLinkOwn: false, canLinkOthers: false }),
		).toEqual(["材料名・食材名は、入力すると補完が出ます"]);
		expect(
			buildRecipeTips({ canLinkOwn: true, canLinkOthers: false }),
		).toHaveLength(2);
		expect(
			buildRecipeTips({ canLinkOwn: true, canLinkOthers: true })[1],
		).toContain("[[@");
	});

	it("Tips の見出しと中黒で、まとめる", () => {
		expect(formatRecipeTips(["a", "b"])).toBe("Tips\n・a\n・b");
	});

	it("見出しだけで、中身がないときだけ、true", () => {
		expect(hasOnlyHeadings("＜下準備＞\n\n＜材料＞\n\n＜作り方＞\n")).toBe(
			true,
		);
		expect(hasOnlyHeadings("＜材料＞\n卵 1個")).toBe(false);
		expect(hasOnlyHeadings("")).toBe(false);
		expect(hasOnlyHeadings("\n\n")).toBe(false);
	});
});
