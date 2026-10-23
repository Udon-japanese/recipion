import { describe, expect, it, vi } from "vitest";
import { createOpenRouterRestRunner } from "./openrouter-rest-runner";

const request = {
	messages: [{ role: "user" as const, content: "こんにちは" }],
};

function jsonResponse(body: unknown, init?: ResponseInit) {
	return new Response(JSON.stringify(body), init);
}

describe("createOpenRouterRestRunner", () => {
	it("モデルと鍵を付けて送り、最初の選択肢の本文を返す", async () => {
		const fetchImpl = vi.fn(async () =>
			jsonResponse({ choices: [{ message: { content: "ok" } }] }),
		);
		const runner = createOpenRouterRestRunner({
			apiKey: "key",
			model: "vendor/model",
			fetchImpl,
		});

		expect(await runner(request)).toBe("ok");

		const [url, init] = fetchImpl.mock.calls[0] as unknown as [
			string,
			RequestInit,
		];
		expect(url).toBe("https://openrouter.ai/api/v1/chat/completions");
		expect(new Headers(init.headers).get("Authorization")).toBe("Bearer key");
		expect(JSON.parse(String(init.body))).toMatchObject({
			model: "vendor/model",
			messages: request.messages,
			temperature: 0,
		});
	});

	it("429 は、Retry-After の秒数だけ待って、やり直す", async () => {
		const wait = vi.fn(async () => {});
		const fetchImpl = vi
			.fn()
			.mockResolvedValueOnce(
				jsonResponse({}, { status: 429, headers: { "Retry-After": "7" } }),
			)
			.mockResolvedValueOnce(
				jsonResponse({ choices: [{ message: { content: "ok" } }] }),
			);
		const runner = createOpenRouterRestRunner({
			apiKey: "key",
			model: "m",
			wait,
			fetchImpl,
		});

		expect(await runner(request)).toBe("ok");
		expect(wait).toHaveBeenCalledWith(7000);
	});

	it("429 が続くときは、回数の上限で、失敗として投げる", async () => {
		const fetchImpl = vi.fn(async () =>
			jsonResponse({ error: "limit" }, { status: 429 }),
		);
		const runner = createOpenRouterRestRunner({
			apiKey: "key",
			model: "m",
			maxRetries: 2,
			wait: async () => {},
			fetchImpl,
		});

		await expect(runner(request)).rejects.toThrow("429");
		expect(fetchImpl).toHaveBeenCalledTimes(3);
	});

	it("本文が文字列でない応答は、失敗として投げる", async () => {
		const runner = createOpenRouterRestRunner({
			apiKey: "key",
			model: "m",
			fetchImpl: async () => jsonResponse({ choices: [] }),
		});

		await expect(runner(request)).rejects.toThrow("想定と違います");
	});
});
