import { describe, expect, it } from "vitest";
import teapotHtml from "./teapot-418.html?raw";
import { createTeapotResponse } from "./teapot-page";

describe("418 の急須のページ（/teapot）", () => {
	it("ステータス 418 で、HTML を返し、検索エンジンには載せない", async () => {
		const response = createTeapotResponse();

		expect(response.status).toBe(418);
		expect(response.headers.get("content-type")).toContain("text/html");
		expect(response.headers.get("x-robots-tag")).toContain("noindex");
		expect(await response.text()).toContain("<title>418 I'm a teapot</title>");
	});

	it("小さく保つ（2 KB 以内）", () => {
		expect(new TextEncoder().encode(teapotHtml).length).toBeLessThanOrEqual(
			2048,
		);
	});

	it("JavaScript を使わず、外部のファイルを読み込まない", () => {
		expect(teapotHtml).not.toMatch(/<script/iu);
		expect(teapotHtml).not.toMatch(/(src|href)=["']?https?:/iu);
		expect(teapotHtml).not.toMatch(/<link\b/iu);
		expect(teapotHtml).not.toMatch(/url\(/iu);
	});

	it("アプリのトップ（/）へ戻るリンクと、押せるチェックボックスがある", () => {
		expect(teapotHtml).toMatch(/<a href=\/>/u);
		expect(teapotHtml).toMatch(/<input type=checkbox id=t aria-label=/u);
		expect(teapotHtml).toMatch(/<label for=t>/u);
	});

	it("動きを減らす設定では、動かさない", () => {
		expect(teapotHtml).toContain("prefers-reduced-motion:reduce");
	});
});
