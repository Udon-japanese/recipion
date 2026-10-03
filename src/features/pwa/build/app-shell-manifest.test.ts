import { describe, expect, it } from "vitest";
import {
	collectPrecacheUrls,
	createBuildId,
	findShellProblems,
	renderBuildScript,
} from "./app-shell-manifest";

describe("collectPrecacheUrls", () => {
	it("エントリ・CSS・アセットを、重複なく、並びを固定して列挙する", () => {
		expect(
			collectPrecacheUrls({
				"src/main.tsx": {
					file: "assets/index-a.js",
					css: ["assets/index-a.css"],
				},
				"src/routes/shopping.tsx": {
					file: "assets/shopping-b.js",
					css: ["assets/index-a.css", "assets/shopping-b.css"],
					assets: ["assets/icon-c.svg"],
				},
			}),
		).toEqual([
			"/assets/icon-c.svg",
			"/assets/index-a.css",
			"/assets/index-a.js",
			"/assets/shopping-b.css",
			"/assets/shopping-b.js",
		]);
	});
});

describe("createBuildId", () => {
	it("同じ入力なら同じ ID、入力が変われば別の ID になる", () => {
		expect(createBuildId(["a", "b"])).toBe(createBuildId(["a", "b"]));
		expect(createBuildId(["a", "b"])).not.toBe(createBuildId(["a", "c"]));
		// 区切りの違いで、別の入力が同じ ID にならない
		expect(createBuildId(["ab", "c"])).not.toBe(createBuildId(["a", "bc"]));
	});
});

describe("renderBuildScript", () => {
	it("サービスワーカーが読める形で、ビルド ID と一覧を出力する", () => {
		const script = renderBuildScript("abc123", ["/assets/a.js"]);
		const self: { __APP_BUILD__?: unknown } = {};

		new Function("self", script)(self);

		expect(self.__APP_BUILD__).toEqual({
			id: "abc123",
			urls: ["/assets/a.js"],
		});
	});
});

describe("findShellProblems", () => {
	const shell =
		"<html><body><nav></nav><script>l:{initialSession:void 0}</script></body></html>";

	it("ルートだけの骨組みなら、問題なしとする", () => {
		expect(findShellProblems(shell)).toEqual([]);
	});

	it("ページの内容、ユーザーの情報、null の初期セッションを検出する", () => {
		expect(
			findShellProblems(`${shell}<a href="/shopping">買い物メモ</a>`),
		).toHaveLength(1);
		expect(
			findShellProblems(
				'<html>{initialSession:{user:{id:"u1",name:"山田"}}}</html>',
			),
		).toHaveLength(1);
		expect(
			findShellProblems("<html>{initialSession:null}</html>"),
		).toHaveLength(1);
		expect(findShellProblems("not html")).toHaveLength(1);
	});
});
