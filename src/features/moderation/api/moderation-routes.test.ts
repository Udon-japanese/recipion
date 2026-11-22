import { describe, expect, it, vi } from "vitest";

import { createTestApiApp } from "#/api/testing/create-test-api-app";
import type { ModerationOperations } from "./moderation-operations";

function createApp() {
	const operations: ModerationOperations = {
		accountStatus: vi.fn(async () => "suspended" as const),
		submitAppeal: vi.fn(async () => ({ status: "not-allowed" as const })),
	};
	const resolveSession = vi.fn(async () => ({
		db: {} as never,
		userId: "user-1",
	}));
	const app = createTestApiApp({
		moderation: { resolveSession, createOperations: () => operations },
	});

	return { app, operations, resolveSession };
}

describe("停止の状態と申し立ての API", () => {
	it("停止の状態：停止中のユーザーも通す（停止の画面を出すため）", async () => {
		const { app, resolveSession } = createApp();
		const response = await app.request("/api/v1/moderation/account-status", {
			headers: { authorization: "Bearer a.b" },
		});

		expect(await response.json()).toEqual({ status: "suspended" });
		expect(resolveSession).toHaveBeenCalledWith(expect.any(Headers), {
			allowSuspended: true,
		});
	});

	it("申し立て：空の文は 400（申し立てない）", async () => {
		const { app, operations } = createApp();
		const response = await app.request("/api/v1/moderation/appeals", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: "Bearer a.b",
			},
			body: JSON.stringify({ message: "   " }),
		});

		expect(response.status).toBe(400);
		expect(operations.submitAppeal).not.toHaveBeenCalled();
	});
});
