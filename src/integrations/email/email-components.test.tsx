import { describe, expect, it } from "vitest";
import { EmailLayout, Paragraph } from "./email-components";
import { renderEmail } from "./render-email";

describe("renderEmail", () => {
	it("doctype つきの HTML にして、れしぽよの画像（絶対 URL）と、一覧に出る短い文を含める", () => {
		const html = renderEmail(
			<EmailLayout preheader="短い文">
				<Paragraph>本文</Paragraph>
			</EmailLayout>,
		);

		expect(html.startsWith("<!doctype html>")).toBe(true);
		expect(html).toContain('src="https://recipion.app/email/mascot.png"');
		expect(html).toContain("短い文");
		expect(html).toContain("contact@recipion.app");
	});

	it("利用者の文字に含まれる HTML の記号を、エスケープする", () => {
		const html = renderEmail(
			<EmailLayout preheader="x">
				<Paragraph>{'<img src="x" onerror="a">'}</Paragraph>
			</EmailLayout>,
		);

		expect(html).toContain("&lt;img");
		expect(html).not.toContain('<img src="x"');
	});
});
