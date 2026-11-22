import { describe, expect, it, vi } from "vitest";

import { createTestApiApp } from "#/api/testing/create-test-api-app";
import type { ReportOperations } from "./report-operations";

function createApp() {
	const operations: ReportOperations = {
		reportRecipe: vi.fn(async () => "created" as const),
		reportUserName: vi.fn(async () => "created" as const),
	};
	const app = createTestApiApp({
		reports: {
			resolveSession: vi.fn(async () => ({
				db: {} as never,
				userId: "user-1",
			})),
			createOperations: () => operations,
		},
	});

	return { app, operations };
}

function post(
	app: ReturnType<typeof createApp>["app"],
	path: string,
	body: unknown,
) {
	return app.request(`/api/v1/reports${path}`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: "Bearer a.b",
		},
		body: JSON.stringify(body),
	});
}

describe("通報の API", () => {
	it("レシピの通報：結果を { result } で返す", async () => {
		const { app, operations } = createApp();
		const response = await post(app, "/recipes", {
			recipePublicId: "recipe-1",
			reason: "inappropriate",
			detail: "",
		});

		expect(await response.json()).toEqual({ result: "created" });
		expect(operations.reportRecipe).toHaveBeenCalledWith(
			expect.objectContaining({ recipePublicId: "recipe-1" }),
		);
	});

	it("利用者は「自動検知」を理由に選べない（400。通報しない）", async () => {
		const { app, operations } = createApp();
		const response = await post(app, "/recipes", {
			recipePublicId: "recipe-1",
			reason: "auto-detected",
			detail: "",
		});

		expect(response.status).toBe(400);
		expect(operations.reportRecipe).not.toHaveBeenCalled();
	});
});
