import { describe, expect, it } from "vitest";
import {
	findStaticPageProblems,
	renderedStaticPages,
	shellCopyPaths,
	staticPageOutputPath,
} from "./static-pages";

describe("staticPageOutputPath", () => {
	it("パスを、拡張子 .html のファイルにする（転送を避けるため。先頭・末尾の / は、除く）", () => {
		expect(staticPageOutputPath("/terms")).toBe("terms.html");
		expect(staticPageOutputPath("/recipes/new")).toBe("recipes/new.html");
		expect(staticPageOutputPath("/privacy/")).toBe("privacy.html");
	});
});

describe("静的にするページの一覧", () => {
	it("パスは重ならず、/ で始まる。動的なパス（$）や、データの画面は含めない", () => {
		const paths = [
			...renderedStaticPages.map((page) => page.path),
			...shellCopyPaths,
		];

		expect(new Set(paths).size).toBe(paths.length);

		for (const path of paths) {
			expect(path).toMatch(/^\/[a-z/]+$/u);
		}
	});
});

describe("findStaticPageProblems", () => {
	const good =
		"<html><body>利用規約 <script>{initialSession:void 0}</script></body></html>";

	it("本文があり、ログイン状態が焼き込まれていなければ、問題なし", () => {
		expect(findStaticPageProblems(good, "利用規約")).toEqual([]);
	});

	it("本文がない・HTML でない・ログイン状態が焼き込まれている場合を、見つける", () => {
		expect(findStaticPageProblems("<html></html>", "利用規約")).toHaveLength(1);
		expect(findStaticPageProblems("あ", "利用規約")).toHaveLength(2);
		expect(
			findStaticPageProblems(
				"<html>利用規約 {initialSession:null}</html>",
				"利用規約",
			)[0],
		).toContain("initialSession が null");
		expect(
			findStaticPageProblems(
				'<html>利用規約 {initialSession:{user:{id:"1"}}}</html>',
				"利用規約",
			)[0],
		).toContain("セッション情報");
	});
});
