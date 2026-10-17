import { describe, expect, it, vi } from "vitest";
import { createResendMailer } from "./resend-mailer";

const message = {
	to: "user@example.com",
	subject: "件名",
	text: "本文 123456",
	html: "<p>本文 123456</p>",
};

describe("createResendMailer", () => {
	it("Resend の API に、認証ヘッダーと固定の差出人で、送信を依頼する", async () => {
		const fetchImpl = vi.fn(
			async (_url: string | URL | Request, _init?: RequestInit) =>
				new Response(JSON.stringify({ id: "mail-1" }), { status: 200 }),
		);

		await createResendMailer("re_test_key", fetchImpl).send(message);

		expect(fetchImpl).toHaveBeenCalledTimes(1);
		const [url, init] = fetchImpl.mock.calls[0] ?? [];

		expect(url).toBe("https://api.resend.com/emails");
		expect(init?.method).toBe("POST");
		expect(init?.headers).toMatchObject({
			Authorization: "Bearer re_test_key",
			"Content-Type": "application/json",
		});
		expect(JSON.parse(String(init?.body))).toEqual({
			from: "れしぴょん <contact@recipion.app>",
			to: ["user@example.com"],
			subject: "件名",
			text: "本文 123456",
			html: "<p>本文 123456</p>",
		});
	});

	it("宛先が複数のときは、すべてを宛先にする", async () => {
		const fetchImpl = vi.fn(
			async (_url: string | URL | Request, _init?: RequestInit) =>
				new Response("{}", { status: 200 }),
		);

		await createResendMailer("k", fetchImpl).send({
			...message,
			to: ["a@example.com", "b@example.com"],
		});

		const [, init] = fetchImpl.mock.calls[0] ?? [];

		expect(JSON.parse(String(init?.body)).to).toEqual([
			"a@example.com",
			"b@example.com",
		]);
	});

	it("失敗したら、状態コードだけを含むエラーにする（API キーや本文は含めない）", async () => {
		const fetchImpl = vi.fn(
			async () => new Response("domain is not verified", { status: 403 }),
		);

		const error = await createResendMailer("re_test_key", fetchImpl)
			.send(message)
			.catch((e: unknown) => e);

		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toContain("403");
		expect((error as Error).message).not.toContain("re_test_key");
		expect((error as Error).message).not.toContain("123456");
		expect((error as Error).message).not.toContain("domain is not verified");
	});
});
