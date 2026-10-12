import { describe, expect, it } from "vitest";
import {
	type AuthRateLimiters,
	checkAuthRateLimit,
	DELETE_USER_PATH,
	type RateLimiter,
	SEND_CODE_PATH,
	VERIFY_CODE_PATH,
} from "./auth-rate-limit";

// 同じキーを、上限まで数えるだけの、簡易なレートリミッター。
function createLimiter(maxPerKey: number): RateLimiter & { keys: string[] } {
	const counts = new Map<string, number>();
	const keys: string[] = [];

	return {
		keys,
		async limit({ key }) {
			keys.push(key);
			const count = (counts.get(key) ?? 0) + 1;
			counts.set(key, count);

			return { success: count <= maxPerKey };
		},
	};
}

function createLimiters(
	overrides: Partial<Record<keyof AuthRateLimiters, number>> = {},
) {
	const sendByEmail = createLimiter(overrides.sendByEmail ?? 3);
	const sendByIp = createLimiter(overrides.sendByIp ?? 6);
	const verifyByIp = createLimiter(overrides.verifyByIp ?? 15);

	return { sendByEmail, sendByIp, verifyByIp };
}

describe("checkAuthRateLimit", () => {
	it("コードの送信は、メールアドレスごとの上限を超えると拒否する", async () => {
		const limiters = createLimiters({ sendByEmail: 2 });
		const request = {
			path: SEND_CODE_PATH,
			email: "a@example.com",
			ip: "1.1.1.1",
		};

		expect((await checkAuthRateLimit(request, limiters)).allowed).toBe(true);
		expect((await checkAuthRateLimit(request, limiters)).allowed).toBe(true);
		expect((await checkAuthRateLimit(request, limiters)).allowed).toBe(false);
	});

	it("コードの送信は、メールアドレスの大文字小文字と前後の空白を同じものとして数える", async () => {
		const limiters = createLimiters({ sendByEmail: 1 });
		const base = { path: SEND_CODE_PATH, ip: "1.1.1.1" };

		expect(
			(await checkAuthRateLimit({ ...base, email: "A@Example.com" }, limiters))
				.allowed,
		).toBe(true);
		expect(
			(
				await checkAuthRateLimit(
					{ ...base, email: " a@example.com " },
					limiters,
				)
			).allowed,
		).toBe(false);
	});

	it("別のメールアドレス宛ての送信は、メールアドレスごとの上限に影響しない", async () => {
		const limiters = createLimiters({ sendByEmail: 1, sendByIp: 100 });

		expect(
			(
				await checkAuthRateLimit(
					{ path: SEND_CODE_PATH, email: "a@example.com", ip: "1.1.1.1" },
					limiters,
				)
			).allowed,
		).toBe(true);
		expect(
			(
				await checkAuthRateLimit(
					{ path: SEND_CODE_PATH, email: "b@example.com", ip: "1.1.1.1" },
					limiters,
				)
			).allowed,
		).toBe(true);
	});

	it("コードの送信は、IP ごとの上限も超えると拒否する（宛先を変えても）", async () => {
		const limiters = createLimiters({ sendByIp: 2 });
		const send = (email: string) =>
			checkAuthRateLimit(
				{ path: SEND_CODE_PATH, email, ip: "1.1.1.1" },
				limiters,
			);

		expect((await send("a@example.com")).allowed).toBe(true);
		expect((await send("b@example.com")).allowed).toBe(true);
		expect((await send("c@example.com")).allowed).toBe(false);
	});

	it("キーに、メールアドレスや IP をそのまま含めない", async () => {
		const limiters = createLimiters();

		await checkAuthRateLimit(
			{ path: SEND_CODE_PATH, email: "secret@example.com", ip: "203.0.113.7" },
			limiters,
		);

		const keys = [...limiters.sendByEmail.keys, ...limiters.sendByIp.keys];

		expect(keys).toHaveLength(2);
		for (const key of keys) {
			expect(key).not.toContain("secret");
			expect(key).not.toContain("203.0.113.7");
		}
	});

	it("コードの検証は、IP ごとの上限を超えると拒否する", async () => {
		const limiters = createLimiters({ verifyByIp: 1 });
		const request = { path: VERIFY_CODE_PATH, email: null, ip: "1.1.1.1" };

		expect((await checkAuthRateLimit(request, limiters)).allowed).toBe(true);
		expect((await checkAuthRateLimit(request, limiters)).allowed).toBe(false);
	});

	it("認証以外のパスは、制限せず、レートリミッターも呼ばない", async () => {
		const limiters = createLimiters();

		const result = await checkAuthRateLimit(
			{ path: "/get-session", email: null, ip: "1.1.1.1" },
			limiters,
		);

		expect(result.allowed).toBe(true);
		expect(limiters.sendByEmail.keys).toHaveLength(0);
		expect(limiters.sendByIp.keys).toHaveLength(0);
		expect(limiters.verifyByIp.keys).toHaveLength(0);
	});

	it("アカウントの削除の確認メールの送信は、IP ごとに制限する", async () => {
		const limiters = createLimiters({ sendByIp: 2 });
		const request = { path: DELETE_USER_PATH, email: null, ip: "1.1.1.1" };

		expect((await checkAuthRateLimit(request, limiters)).allowed).toBe(true);
		expect((await checkAuthRateLimit(request, limiters)).allowed).toBe(true);
		expect((await checkAuthRateLimit(request, limiters)).allowed).toBe(false);
	});
});
