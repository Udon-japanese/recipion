import { describe, expect, it, vi } from "vitest";

import { createTestApiApp } from "#/api/testing/create-test-api-app";
import type { IngredientDictionaryRepository } from "../application/ingredient-dictionary-repository";

function createApp() {
	const repository: IngredientDictionaryRepository = {
		list: vi.fn(async () => []),
		create: vi.fn(async () => "id-1"),
		rename: vi.fn(),
		addAlias: vi.fn(),
		removeAlias: vi.fn(),
		remove: vi.fn(),
		absorb: vi.fn(),
		setUnmanaged: vi.fn(),
	};
	const resolveSession = vi.fn(async () => ({
		db: {} as never,
		userId: "user-1",
	}));
	const app = createTestApiApp({
		ingredientDictionary: {
			resolveSession,
			createRepository: () => repository,
		},
	});

	return { app, repository, resolveSession };
}

describe("食材辞書の API", () => {
	it("一覧：画面が思っているユーザーを、セッションの確認に渡す（端末のキャッシュに、別の人の辞書を入れない）", async () => {
		const { app, resolveSession } = createApp();
		const response = await app.request(
			"/api/v1/ingredients/dictionary?expectedUserId=user-1",
			{ headers: { authorization: "Bearer a.b" } },
		);

		expect(await response.json()).toEqual([]);
		expect(resolveSession).toHaveBeenCalledWith(expect.any(Headers), {
			expectedUserId: "user-1",
		});
	});

	it("書き込み：知らない操作は 400（書き込まない）", async () => {
		const { app, repository } = createApp();
		const response = await app.request("/api/v1/ingredients/dictionary", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: "Bearer a.b",
			},
			body: JSON.stringify({
				expectedUserId: "user-1",
				command: { kind: "drop-everything" },
			}),
		});

		expect(response.status).toBe(400);
		expect(repository.list).not.toHaveBeenCalled();
	});
});
