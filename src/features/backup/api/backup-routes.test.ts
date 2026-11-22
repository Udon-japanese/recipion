import { describe, expect, it, vi } from "vitest";

import { createTestApiApp } from "#/api/testing/create-test-api-app";
import { buildBackupRecipe } from "#/test/builders/build-backup";
import type { BackupOperations } from "./backup-operations";

function createApp() {
	const operations: BackupOperations = {
		exportRecipes: vi.fn(async () => ({ recipes: [], nextOffset: null })),
		exportInventory: vi.fn(async () => []),
		exportDictionary: vi.fn(async () => []),
		inspect: vi.fn(async () => ({ ownedPublicIds: [], recipeCount: 0 })),
		importRecipes: vi.fn(async () => []),
		importLinks: vi.fn(async () => ({ dropped: 0 })),
		replaceInventory: vi.fn(async () => ({ items: 0, lots: 0 })),
		mergeDictionary: vi.fn(async () => ({
			created: 0,
			aliases: 0,
			skipped: 0,
		})),
	};
	const app = createTestApiApp({
		backup: {
			resolveSession: vi.fn(async () => ({
				db: {} as never,
				userId: "user-1",
			})),
			createOperations: () => operations,
		},
	});

	return { app, operations };
}

const authorization = { authorization: "Bearer a.b" };

function post(
	app: ReturnType<typeof createApp>["app"],
	path: string,
	body: unknown,
) {
	return app.request(`/api/v1/backup${path}`, {
		method: "POST",
		headers: { "content-type": "application/json", ...authorization },
		body: JSON.stringify(body),
	});
}

describe("書き出し・読み込みの API", () => {
	it.each([
		["0", 200],
		["25", 200],
		["-1", 400],
		["abc", 400],
	] as const)(
		"書き出し：レシピの位置 offset=%s は %i",
		async (offset, status) => {
			const { app, operations } = createApp();
			const response = await app.request(
				`/api/v1/backup/recipes?offset=${offset}`,
				{
					headers: authorization,
				},
			);

			expect(response.status).toBe(status);

			if (status === 200) {
				expect(operations.exportRecipes).toHaveBeenCalledWith(Number(offset));
			}
		},
	);

	it("読み込み：レシピを1件ずつ確かめてから渡す", async () => {
		const { app, operations } = createApp();
		const recipe = buildBackupRecipe();
		const response = await post(app, "/recipes", { recipes: [recipe] });

		expect(response.status).toBe(200);
		expect(operations.importRecipes).toHaveBeenCalledWith([
			expect.objectContaining({ publicId: recipe.publicId }),
		]);
	});

	it("読み込み：形の悪いレシピは、どのレシピかが分かる文で 400（1件も読み込まない）", async () => {
		const { app, operations } = createApp();
		const good = buildBackupRecipe();
		// 作り方が配列でない（形が壊れた）レシピ。
		const bad = {
			...good,
			publicId: "bad-1",
			content: { ...good.content, name: "肉じゃが", instructions: "壊れた形" },
		};
		const response = await post(app, "/recipes", { recipes: [good, bad] });

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: {
				code: "INVALID_INPUT",
				message: expect.stringContaining("レシピ「肉じゃが」"),
			},
		});
		expect(operations.importRecipes).not.toHaveBeenCalled();
	});
});
