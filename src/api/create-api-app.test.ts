import { describe, expect, it, vi } from "vitest";
import { createApiApp } from "./create-api-app";

const minimumClientVersions = { android: "1.2.0", ios: "1.0.0", web: "0.0.0" };

function createApp() {
	const handleAuth = vi.fn(async () => new Response("auth"));

	return {
		app: createApiApp({
			handleAuth,
			minimumClientVersions,
			shoppingSync: {
				resolveSession: vi.fn(),
				createStore: vi.fn(),
			},
		}),
		handleAuth,
	};
}

describe("createApiApp", () => {
	it("/api/auth/* は、Better Auth に渡す", async () => {
		const { app, handleAuth } = createApp();
		const response = await app.request("/api/auth/get-session");

		expect(await response.text()).toBe("auth");
		expect(handleAuth).toHaveBeenCalledOnce();
	});

	it("/api/v1/meta は、古い版のアプリにも、最も古い版を返す", async () => {
		const { app } = createApp();
		const response = await app.request("/api/v1/meta", {
			headers: { "x-recipion-client": "android/0.1.0" },
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ minimumClientVersions });
	});

	it("最も古い版より古いアプリには、426 と CLIENT_UPDATE_REQUIRED を返す", async () => {
		const { app } = createApp();
		const response = await app.request("/api/v1/anything", {
			headers: { "x-recipion-client": "android/1.1.9" },
		});

		expect(response.status).toBe(426);
		expect(await response.json()).toMatchObject({
			error: { code: "CLIENT_UPDATE_REQUIRED" },
		});
	});

	it("形の違うヘッダーは、400 と INVALID_INPUT", async () => {
		const { app } = createApp();
		const response = await app.request("/api/v1/anything", {
			headers: { "x-recipion-client": "android" },
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: { code: "INVALID_INPUT" },
		});
	});

	it("ヘッダーのない要求は、当面は通す（今の Web の画面は送らない）", async () => {
		const { app } = createApp();
		const response = await app.request("/api/v1/anything");

		expect(response.status).toBe(404);
		expect(await response.json()).toMatchObject({
			error: { code: "NOT_FOUND" },
		});
	});

	it("Cookie つきで別のサイトからの POST は、403 と FORBIDDEN", async () => {
		const { app } = createApp();
		const response = await app.request("/api/v1/anything", {
			method: "POST",
			headers: {
				cookie: "better-auth.session_token=a.b",
				origin: "https://evil.example",
			},
		});

		expect(response.status).toBe(403);
		expect(await response.json()).toMatchObject({
			error: { code: "FORBIDDEN" },
		});
	});

	it("bearer の POST は、オリジンがなくても通す（アプリ）", async () => {
		const { app } = createApp();
		const response = await app.request("/api/v1/anything", {
			method: "POST",
			headers: {
				authorization: "Bearer a.b",
				"x-recipion-client": "android/1.2.0",
			},
		});

		expect(response.status).toBe(404);
	});
});
