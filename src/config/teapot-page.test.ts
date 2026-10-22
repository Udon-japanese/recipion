import { describe, expect, it } from "vitest";
import teapotHtml from "./teapot-418.html?raw";
import { createTeapotResponse } from "./teapot-page";

function scriptLines(html: string): string[] {
	const match = html.match(/<script>([\s\S]*?)<\/script>/u);

	return (match?.[1] ?? "").split("\n").filter((line) => line.trim() !== "");
}

describe("418 の急須のページ（/teapot）", () => {
	it("ステータス 418 で、HTML を返し、検索エンジンには載せず、短く保存させる", async () => {
		const response = createTeapotResponse();

		expect(response.status).toBe(418);
		expect(response.headers.get("content-type")).toContain("text/html");
		expect(response.headers.get("x-robots-tag")).toContain("noindex");
		expect(response.headers.get("cache-control")).toContain("max-age=300");
		expect(await response.text()).toContain("<title>418 ");
	});

	it("小さく保つ（12 KB 以内、JavaScript は 50 行以内）", () => {
		expect(new TextEncoder().encode(teapotHtml).length).toBeLessThanOrEqual(
			12 * 1024,
		);
		expect(scriptLines(teapotHtml).length).toBeLessThanOrEqual(50);
	});

	it("外部のファイルを読み込まず、通信もしない", () => {
		expect(teapotHtml).not.toMatch(/(src|href)=["']?https?:/iu);
		// <link> は、アイコンだけ（指定しないと /favicon.ico を探しに行き、WAF に止められる）。
		expect(teapotHtml.match(/<link\b[^>]*>/giu)).toEqual([
			'<link rel="icon" href="/recipion-icon.svg" type="image/svg+xml">',
		]);
		expect(teapotHtml).not.toMatch(/@import|url\(https?:/iu);
		expect(teapotHtml).not.toMatch(
			/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/u,
		);
	});

	it("アプリのトップ（/）へ戻るリンクと、キーボードで押せる操作部分がある", () => {
		expect(teapotHtml).toMatch(/<a href="\/">/u);
		expect(teapotHtml).toMatch(/role="button" tabindex="0"/u);
	});

	it("動きを減らす設定では、動かさない", () => {
		expect(teapotHtml).toContain("prefers-reduced-motion:reduce");
	});
});
