import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import {
	extractAccessToken,
	isAdminEmail,
	parseAdminEmails,
	verifyAccessToken,
} from "./access-token";

function headersOf(values: Record<string, string>) {
	return {
		get: (name: string) => values[name.toLowerCase()] ?? null,
	};
}

describe("extractAccessToken", () => {
	it("ヘッダーを優先し、なければ Cookie（CF_Authorization）から取る", () => {
		expect(
			extractAccessToken(
				headersOf({
					"cf-access-jwt-assertion": "from-header",
					cookie: "CF_Authorization=from-cookie",
				}),
			),
		).toBe("from-header");
		expect(
			extractAccessToken(
				headersOf({ cookie: "a=b; CF_Authorization=from.cookie.token; c=d" }),
			),
		).toBe("from.cookie.token");
		expect(extractAccessToken(headersOf({ cookie: "a=b" }))).toBeNull();
		expect(extractAccessToken(headersOf({}))).toBeNull();
	});
});

describe("管理者のメールアドレス", () => {
	it("カンマ区切りを、小文字にして一覧にする。未設定・空は、誰も含めない", () => {
		expect(parseAdminEmails(" A@Example.com , b@example.com ,")).toEqual([
			"a@example.com",
			"b@example.com",
		]);
		expect(parseAdminEmails(undefined)).toEqual([]);
		expect(isAdminEmail("A@example.com", ["a@example.com"])).toBe(true);
		expect(isAdminEmail("x@example.com", ["a@example.com"])).toBe(false);
		expect(isAdminEmail("a@example.com", [])).toBe(false);
	});
});

describe("verifyAccessToken", () => {
	const issuer = "https://team.cloudflareaccess.com";
	const audience = "aud-tag";

	async function setup() {
		const { publicKey, privateKey } = await generateKeyPair("RS256");
		const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };

		return { privateKey, getKey: createLocalJWKSet({ keys: [jwk] }) };
	}

	function sign(
		privateKey: CryptoKey,
		claims: { iss?: string; aud?: string; exp?: string; email?: string },
	) {
		return new SignJWT({ email: claims.email })
			.setProtectedHeader({ alg: "RS256", kid: "k1" })
			.setIssuer(claims.iss ?? issuer)
			.setAudience(claims.aud ?? audience)
			.setExpirationTime(claims.exp ?? "5m")
			.sign(privateKey);
	}

	it("正しいトークンは、メールアドレスを返す", async () => {
		const { privateKey, getKey } = await setup();
		const token = await sign(privateKey, { email: "me@example.com" });

		expect(
			await verifyAccessToken(token, { issuer, audience, getKey }),
		).toEqual({ email: "me@example.com" });
	});

	it("発行元・対象のアプリ・期限・署名が違うもの、メールのないものは、断る", async () => {
		const { privateKey, getKey } = await setup();
		const other = await generateKeyPair("RS256");
		const options = { issuer, audience, getKey };

		expect(
			await verifyAccessToken(
				await sign(privateKey, { email: "a@b.c", iss: "https://evil" }),
				options,
			),
		).toBeNull();
		expect(
			await verifyAccessToken(
				await sign(privateKey, { email: "a@b.c", aud: "other" }),
				options,
			),
		).toBeNull();
		expect(
			await verifyAccessToken(
				await sign(privateKey, { email: "a@b.c", exp: "-1m" }),
				options,
			),
		).toBeNull();
		expect(
			await verifyAccessToken(
				await sign(other.privateKey, { email: "a@b.c" }),
				options,
			),
		).toBeNull();
		expect(
			await verifyAccessToken(await sign(privateKey, {}), options),
		).toBeNull();
		expect(await verifyAccessToken("not-a-jwt", options)).toBeNull();
	});
});
