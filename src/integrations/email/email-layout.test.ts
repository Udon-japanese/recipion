import { describe, expect, it } from "vitest";
import { emailParagraph, escapeHtml, renderEmailHtml } from "./email-layout";

describe("escapeHtml", () => {
	it("HTML として解釈される記号を、エスケープする", () => {
		expect(escapeHtml(`<img src="x" onerror='a'>&`)).toBe(
			"&lt;img src=&quot;x&quot; onerror=&#39;a&#39;&gt;&amp;",
		);
	});
});

describe("renderEmailHtml", () => {
	it("れしぽよの画像（絶対 URL）、本文、メールの一覧に出る短い文を含める", () => {
		const html = renderEmailHtml({
			preheader: "短い文",
			bodyHtml: emailParagraph("<b>本文</b>"),
		});

		expect(html).toContain('src="https://recipion.app/email/mascot.png"');
		expect(html).toContain("短い文");
		expect(html).toContain("&lt;b&gt;本文&lt;/b&gt;");
		expect(html).not.toContain("<b>本文</b>");
	});
});
