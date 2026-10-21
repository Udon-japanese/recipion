import { describe, expect, it } from "vitest";
import teapotHtml from "../../waf/teapot-418.html?raw";

// waf/teapot-418.html は、Cloudflare の WAF のカスタムレスポンス（ステータス 418）の本文として、ダッシュボードに貼る。
// 本文は 2 KB（2048 バイト）までなので、超えないことを固定する（日本語は 1 文字 3 バイト）。
describe("418 の急須のページ（WAF の本文）", () => {
	it("2048 バイト以内", () => {
		expect(new TextEncoder().encode(teapotHtml).length).toBeLessThanOrEqual(
			2048,
		);
	});

	it("JavaScript を使わず、外部のファイルを読み込まない（WAF は、この1つの本文だけを返す）", () => {
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

	it("タイトルは「418 I'm a teapot」", () => {
		expect(teapotHtml).toContain("<title>418 I'm a teapot</title>");
	});
});
