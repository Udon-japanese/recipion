import { describe, expect, it } from "vitest";
import { verifyTurnstileToken } from "./verify-turnstile-token";

function fetchReturning(response: Response) {
	const bodies: unknown[] = [];
	const fetcher: typeof fetch = async (_input, init) => {
		bodies.push(JSON.parse(String(init?.body)));

		return response;
	};

	return { fetcher, bodies };
}

describe("verifyTurnstileToken", () => {
	it.each([
		{ success: true, expected: true },
		{ success: false, expected: false },
	])(
		"Turnstile の答えが $success なら $expected",
		async ({ success, expected }) => {
			const { fetcher } = fetchReturning(Response.json({ success }));

			expect(
				await verifyTurnstileToken(
					{ token: "t", secretKey: "s", remoteIp: null },
					fetcher,
				),
			).toBe(expected);
		},
	);

	it("トークン・シークレットキー・利用者の IP を送る", async () => {
		const { fetcher, bodies } = fetchReturning(
			Response.json({ success: true }),
		);

		await verifyTurnstileToken(
			{ token: "t", secretKey: "s", remoteIp: "203.0.113.7" },
			fetcher,
		);

		expect(bodies).toEqual([
			{ secret: "s", response: "t", remoteip: "203.0.113.7" },
		]);
	});

	it("Turnstile が失敗を返したら、通さずに例外を投げる", async () => {
		const { fetcher } = fetchReturning(new Response("", { status: 503 }));

		await expect(
			verifyTurnstileToken(
				{ token: "t", secretKey: "s", remoteIp: null },
				fetcher,
			),
		).rejects.toThrow();
	});
});
