import { describe, expect, it } from "vitest";
import {
	extractLinkLabels,
	formatLink,
	isValidLinkLabel,
	linkLabelMaxLength,
	resolveLinkLabel,
	sanitizeLinkLabel,
	splitTextByLinks,
	stripLinkBrackets,
} from "./recipe-links";

describe("splitTextByLinks", () => {
	it("本文を、文章とリンクに分ける", () => {
		expect(splitTextByLinks("1. [[カレー]]のルウを溶かす")).toEqual([
			{ type: "text", text: "1. " },
			{ type: "link", label: "カレー" },
			{ type: "text", text: "のルウを溶かす" },
		]);
	});

	it("リンクがなければ、文章だけ。空の文章は、空の一覧", () => {
		expect(splitTextByLinks("混ぜる")).toEqual([
			{ type: "text", text: "混ぜる" },
		]);
		expect(splitTextByLinks("")).toEqual([]);
	});

	it("複数のリンクと、連続したリンクを扱う", () => {
		expect(splitTextByLinks("[[A]][[B]] と [[C]]")).toEqual([
			{ type: "link", label: "A" },
			{ type: "link", label: "B" },
			{ type: "text", text: " と " },
			{ type: "link", label: "C" },
		]);
	});

	it("ラベルの前後の空白は除く。使えない書き方は、文章のまま", () => {
		const cases: [string, string][] = [
			["[[ カレー ]]", "カレー"],
			["[[]]", ""],
			["[[   ]]", ""],
			["[[a\nb]]", ""],
			["[[ [a] ]]", ""],
			["[カレー]", ""],
			["[[カレー]", ""],
		];
		const actual = cases.map(([text]) =>
			splitTextByLinks(text).find((segment) => segment.type === "link")
				?.type === "link"
				? extractLinkLabels([text])[0]
				: "",
		);

		expect(actual).toEqual(cases.map(([, expected]) => expected));
	});

	it("リンクでない部分の文字は、変えない", () => {
		const text = "  [[ a ]] \n x ";
		const rebuilt = splitTextByLinks(text)
			.map((segment) => (segment.type === "link" ? "[[ a ]]" : segment.text))
			.join("");

		expect(rebuilt).toBe(text);
	});
});

describe("extractLinkLabels", () => {
	it("複数の文章から、重複を除いて、出てきた順にラベルを集める", () => {
		expect(
			extractLinkLabels([
				"[[カレー]]を作る",
				"[[ごはん]]と[[カレー]]",
				"リンクなし",
			]),
		).toEqual(["カレー", "ごはん"]);
	});
});

describe("isValidLinkLabel / formatLink", () => {
	it("ラベルが使えるか", () => {
		expect(isValidLinkLabel("カレー")).toBe(true);
		expect(isValidLinkLabel("あ".repeat(linkLabelMaxLength))).toBe(true);
		expect(isValidLinkLabel("あ".repeat(linkLabelMaxLength + 1))).toBe(false);
		expect(isValidLinkLabel("")).toBe(false);
		expect(isValidLinkLabel(" カレー")).toBe(false);
		expect(isValidLinkLabel("a]b")).toBe(false);
		expect(isValidLinkLabel("a\nb")).toBe(false);
	});

	it("本文に書く形にする", () => {
		expect(formatLink(" カレー ")).toBe("[[カレー]]");
	});
});

describe("sanitizeLinkLabel / resolveLinkLabel", () => {
	it("名前から、使えるラベルを作る", () => {
		expect(sanitizeLinkLabel("カレー")).toBe("カレー");
		expect(sanitizeLinkLabel("  [特製]  カレー\n ")).toBe("特製 カレー");
		expect(sanitizeLinkLabel("[[]]")).toBe("レシピ");
		expect(sanitizeLinkLabel("あ".repeat(150))).toBe("あ".repeat(100));
		expect(isValidLinkLabel(sanitizeLinkLabel(" [a]\nb "))).toBe(true);
	});

	it("同じラベルが別のレシピに使われていれば、番号を付ける。同じレシピなら、そのラベルを使う", () => {
		const links = [
			{ label: "カレー", targetPublicId: "a" },
			{ label: "カレー（2）", targetPublicId: "b" },
		];

		expect(resolveLinkLabel("カレー", "c", [])).toBe("カレー");
		expect(resolveLinkLabel("カレー", "a", links)).toBe("カレー");
		expect(resolveLinkLabel("カレー", "b", links)).toBe("カレー（2）");
		expect(resolveLinkLabel("カレー", "c", links)).toBe("カレー（3）");
	});

	it("番号を付けても、長さの上限を超えない", () => {
		const long = "あ".repeat(100);
		const label = resolveLinkLabel(long, "b", [
			{ label: long, targetPublicId: "a" },
		]);

		expect([...label]).toHaveLength(100);
		expect(label.endsWith("（2）")).toBe(true);
		expect(isValidLinkLabel(label)).toBe(true);
	});
});

describe("stripLinkBrackets", () => {
	it("リンクの括弧を除いて、ラベルだけにする。リンクのない文章は、そのまま", () => {
		expect(stripLinkBrackets("[[自家製ドレッシング]]")).toBe(
			"自家製ドレッシング",
		);
		expect(stripLinkBrackets("かける [[ソース]] を")).toBe("かける ソース を");
		expect(stripLinkBrackets("玉ねぎ")).toBe("玉ねぎ");
		expect(stripLinkBrackets("[[]]")).toBe("[[]]");
	});
});
