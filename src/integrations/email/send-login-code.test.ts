import { describe, expect, it, vi } from "vitest";
import { renderLoginCodeEmail, sendLoginCodeEmail } from "./send-login-code";

describe("renderLoginCodeEmail", () => {
	it("件名と本文に、コードと有効期限を含める", () => {
		const email = renderLoginCodeEmail("123456");

		expect(email.subject).toBe("【れしぴょん】ログイン用コード: 123456");
		expect(email.text).toContain("123456");
		expect(email.text).toContain("5分間有効");
	});
});

describe("sendLoginCodeEmail", () => {
	const input = {
		to: "user@example.com",
		otp: "123456",
		from: "れしぴょん <login@recipion.app>",
		apiKey: "re_test_key",
	};

	it("Resend の API に、認証ヘッダー付きで送信を依頼する", async () => {
		const fetchImpl = vi.fn(
			async (_url: string | URL | Request, _init?: RequestInit) =>
				new Response(JSON.stringify({ id: "mail-1" }), { status: 200 }),
		);

		await sendLoginCodeEmail(input, fetchImpl);

		expect(fetchImpl).toHaveBeenCalledTimes(1);
		const [url, init] = fetchImpl.mock.calls[0] ?? [];

		expect(url).toBe("https://api.resend.com/emails");
		expect(init?.method).toBe("POST");
		expect(init?.headers).toMatchObject({
			Authorization: "Bearer re_test_key",
			"Content-Type": "application/json",
		});
		expect(JSON.parse(String(init?.body))).toEqual({
			from: "れしぴょん <login@recipion.app>",
			to: ["user@example.com"],
			subject: "【れしぴょん】ログイン用コード: 123456",
			text: expect.stringContaining("123456"),
		});
	});

	it("送信に失敗したら、状態コードだけを含むエラーにする（API キーやコードは含めない）", async () => {
		const fetchImpl = vi.fn(
			async () => new Response("domain is not verified", { status: 403 }),
		);

		const error = await sendLoginCodeEmail(input, fetchImpl).catch(
			(e: unknown) => e,
		);

		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toContain("403");
		expect((error as Error).message).not.toContain("re_test_key");
		expect((error as Error).message).not.toContain("123456");
	});
});
