import { describe, expect, it } from "vitest";
import { deleteAccountEmail } from "./delete-account-email";

describe("deleteAccountEmail", () => {
	it("リンクと、取り消せないこと・有効時間・心当たりがない場合を、本文に書く", () => {
		const { to, subject, text } = deleteAccountEmail(
			"a@example.com",
			"https://x.test/a?b=1",
		);

		expect(to).toBe("a@example.com");
		expect(subject).toContain("アカウントの削除");
		expect(text).toContain("https://x.test/a?b=1");
		expect(text).toContain("取り消せません");
		expect(text).toContain("60分間");
		expect(text).toContain("心当たりがない場合");
	});

	it("HTML には、押せるボタンと、リンクの文字を入れる（記号はエスケープする）", () => {
		const { html } = deleteAccountEmail(
			"a@example.com",
			"https://x.test/a?b=1&c=2",
		);

		expect(html).toContain('href="https://x.test/a?b=1&amp;c=2"');
		expect(html).toContain("アカウントを削除する");
	});
});
