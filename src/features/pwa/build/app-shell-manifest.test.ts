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
	it.each([
		[
			"ビルドした index.html は、問題なし",
			'<div id="app"></div><script type="module" crossorigin src="/assets/main-abc.js"></script>',
			0,
		],
		[
			"入口が、ビルド前の /src/main.tsx のまま",
			'<div id="app"></div><script type="module" src="/src/main.tsx"></script>',
			1,
		],
		["描く場所も、JS もない", "<html></html>", 2],
	] as const)("%s", (_label, html, count) => {
		expect(findShellProblems(html)).toHaveLength(count);
	});
});
