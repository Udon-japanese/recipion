import { describe, expect, it } from "vitest";
import {
	CAPTCHA_HEADER,
	checkSendCodeRequest,
	INTEGRITY_HEADER,
	type SendCodeBotCheck,
	type SendCodeVerifiers,
} from "./send-code-bot-check";

function createVerifiers({
	turnstile = true,
	playIntegrity = true,
}: {
	turnstile?: boolean;
	playIntegrity?: boolean;
} = {}) {
	const calls: string[] = [];
	const verifiers: SendCodeVerifiers = {
		async turnstile(token) {
			calls.push(`turnstile:${token}`);

			return turnstile;
		},
		async playIntegrity(token, email) {
			calls.push(`playIntegrity:${token}:${email}`);

			return playIntegrity;
		},
	};

	return { verifiers, calls };
}

function headers(values: Record<string, string>): Headers {
	return new Headers(values);
}

type Case = {
	name: string;
	values: Record<string, string>;
	verdicts: { turnstile?: boolean; playIntegrity?: boolean };
	expected: SendCodeBotCheck;
};

describe("checkSendCodeRequest", () => {
	it.each<Case>([
		{
			name: "Web：Turnstile が通る",
			values: { "x-recipion-client": "web/1.0.0", [CAPTCHA_HEADER]: "t" },
			verdicts: {},
			expected: { status: "verified" },
		},
		{
			name: "Web：Turnstile に断られる",
			values: { "x-recipion-client": "web/1.0.0", [CAPTCHA_HEADER]: "t" },
			verdicts: { turnstile: false },
			expected: { status: "rejected", code: "VERIFICATION_FAILED" },
		},
		{
			name: "Web：トークンがない",
			values: { "x-recipion-client": "web/1.0.0" },
			verdicts: {},
			expected: { status: "rejected", code: "MISSING_RESPONSE" },
		},
		{
			name: "名乗りのない古い Web：トークンがない",
			values: {},
			verdicts: {},
			expected: { status: "rejected", code: "MISSING_RESPONSE" },
		},
		{
			name: "Android：Play Integrity が通る",
			values: { "x-recipion-client": "android/1.0.0", [INTEGRITY_HEADER]: "p" },
			verdicts: {},
			expected: { status: "verified" },
		},
		{
			name: "Android：Play Integrity が通らない",
			values: { "x-recipion-client": "android/1.0.0", [INTEGRITY_HEADER]: "p" },
			verdicts: { playIntegrity: false },
			expected: { status: "unverified" },
		},
		{
			name: "Android：証明が取れなかった",
			values: { "x-recipion-client": "android/1.0.0" },
			verdicts: {},
			expected: { status: "unverified" },
		},
		{
			name: "iOS：証明はまだない",
			values: { "x-recipion-client": "ios/1.0.0", [INTEGRITY_HEADER]: "p" },
			verdicts: {},
			expected: { status: "unverified" },
		},
		{
			name: "アプリでも、Turnstile のトークンがあれば、それで確かめる",
			values: { "x-recipion-client": "android/1.0.0", [CAPTCHA_HEADER]: "t" },
			verdicts: { turnstile: false },
			expected: { status: "rejected", code: "VERIFICATION_FAILED" },
		},
	])("$name", async ({ values, verdicts, expected }) => {
		const { verifiers } = createVerifiers(verdicts);

		expect(
			await checkSendCodeRequest(
				{ headers: headers(values), email: "a@example.com" },
				verifiers,
			),
		).toEqual(expected);
	});

	it("Play Integrity には、トークンと送信先のメールアドレスを渡す", async () => {
		const { verifiers, calls } = createVerifiers();

		await checkSendCodeRequest(
			{
				headers: headers({
					"x-recipion-client": "android/1.0.0",
					[INTEGRITY_HEADER]: "p",
				}),
				email: "a@example.com",
			},
			verifiers,
		);

		expect(calls).toEqual(["playIntegrity:p:a@example.com"]);
	});

	it("Turnstile に届かないときは、例外をそのまま伝える（断るか通すかを決めない）", async () => {
		const verifiers: SendCodeVerifiers = {
			turnstile: () => Promise.reject(new Error("timeout")),
			playIntegrity: () => Promise.resolve(true),
		};

		await expect(
			checkSendCodeRequest(
				{
					headers: headers({ [CAPTCHA_HEADER]: "t" }),
					email: "a@example.com",
				},
				verifiers,
			),
		).rejects.toThrow("timeout");
	});
});
