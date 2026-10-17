import { describe, expect, it } from "vitest";
import { loginCodeEmail } from "./login-code-email";

describe("loginCodeEmail", () => {
	it("宛先・件名・本文に、コードと有効期限を含める", () => {
		const email = loginCodeEmail("user@example.com", "123456");

		expect(email.to).toBe("user@example.com");
		expect(email.subject).toBe("【れしぴょん】ログイン用コード: 123456");
		expect(email.text).toContain("123456");
		expect(email.text).toContain("5分間有効");
		expect(email.html).toContain("123456");
	});
});
