import { exportPKCS8, generateKeyPair, jwtVerify } from "jose";
import { describe, expect, it } from "vitest";
import { createPlayIntegrityClient } from "./play-integrity-client";

type RecordedRequest = { url: string; init: RequestInit | undefined };

async function setUp() {
	const { publicKey, privateKey } = await generateKeyPair("RS256", {
		extractable: true,
	});
	const serviceAccount = JSON.stringify({
		client_email: "checker@example.iam.gserviceaccount.com",
		private_key: await exportPKCS8(privateKey),
	});
	const requests: RecordedRequest[] = [];
	let tokenCount = 0;
	const fetcher: typeof fetch = async (input, init) => {
		const url = String(input);
		requests.push({ url, init });

		if (url === "https://oauth2.googleapis.com/token") {
			tokenCount += 1;

			return Response.json({
				access_token: `access-${tokenCount}`,
				expires_in: 3600,
				token_type: "Bearer",
			});
		}

		return Response.json({ tokenPayloadExternal: { decoded: true } });
	};
	let currentTime = Date.parse("2026-11-23T12:00:00Z");
	const client = createPlayIntegrityClient(
		serviceAccount,
		fetcher,
		() => currentTime,
	);

	return {
		client,
		requests,
		publicKey,
		advance(ms: number) {
			currentTime += ms;
		},
	};
}

function header(request: RecordedRequest | undefined, name: string) {
	return new Headers(request?.init?.headers).get(name);
}

describe("createPlayIntegrityClient", () => {
	it("サービスアカウントの署名でアクセストークンを取り、トークンを読み解く", async () => {
		const { client, requests, publicKey } = await setUp();

		expect(await client.decode("app.recipion.android", "integrity")).toEqual({
			decoded: true,
		});

		const [tokenRequest, decodeRequest] = requests;
		const form = new URLSearchParams(String(tokenRequest?.init?.body));

		expect(form.get("grant_type")).toBe(
			"urn:ietf:params:oauth:grant-type:jwt-bearer",
		);

		const { payload } = await jwtVerify(
			form.get("assertion") ?? "",
			publicKey,
			{
				issuer: "checker@example.iam.gserviceaccount.com",
				audience: "https://oauth2.googleapis.com/token",
				currentDate: new Date("2026-11-23T12:00:00Z"),
			},
		);

		expect(payload.scope).toBe("https://www.googleapis.com/auth/playintegrity");
		expect(decodeRequest?.url).toBe(
			"https://playintegrity.googleapis.com/v1/app.recipion.android:decodeIntegrityToken",
		);
		expect(header(decodeRequest, "authorization")).toBe("Bearer access-1");
		expect(JSON.parse(String(decodeRequest?.init?.body))).toEqual({
			integrityToken: "integrity",
		});
	});

	it("アクセストークンは、期限の少し前まで使い回し、そのあとは取り直す", async () => {
		const { client, requests, advance } = await setUp();
		const tokenRequests = () =>
			requests.filter(
				(request) => request.url === "https://oauth2.googleapis.com/token",
			);

		await client.decode("app.recipion.android", "1");
		advance(58 * 60_000);
		await client.decode("app.recipion.android", "2");

		expect(tokenRequests()).toHaveLength(1);

		advance(60_000);
		await client.decode("app.recipion.android", "3");

		expect(tokenRequests()).toHaveLength(2);
		expect(header(requests.at(-1), "authorization")).toBe("Bearer access-2");
	});
});
