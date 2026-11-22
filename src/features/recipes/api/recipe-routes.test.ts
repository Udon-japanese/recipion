import { describe, expect, it, vi } from "vitest";

import { createTestApiApp } from "#/api/testing/create-test-api-app";
import { UserFacingError } from "#/errors/user-facing-error";
import { createRecipeEditorDocument } from "../domain/recipe-editor-document";
import {
	createRecipeSnapshot,
	PARENT_CHANGED_AGAIN_MESSAGE,
} from "../domain/recipe-snapshot";
import type { RecipeOperations } from "./recipe-operations";

function createDocument() {
	return createRecipeEditorDocument({
		name: "卵焼き",
		ingredientText: "卵 2個",
		instructionText: "1. 卵を溶く\n2. 焼く",
	});
}

function createOperations(
	overrides: Partial<RecipeOperations> = {},
): RecipeOperations {
	return {
		list: vi.fn(async () => []),
		getViewable: vi.fn(async () => null),
		getOwn: vi.fn(async () => null),
		searchPublic: vi.fn(),
		getHouseholdSize: vi.fn(async () => null),
		updateHouseholdSize: vi.fn(async (size: number | null) => size),
		view: vi.fn(async () => null),
		unlock: vi.fn(async () => "wrong" as const),
		getPassphrase: vi.fn(async () => null),
		regeneratePassphrase: vi.fn(async () => "あたらしい-あいことば"),
		linked: vi.fn(async () => ({})),
		searchLinkableUsers: vi.fn(async () => []),
		listUserPublicRecipes: vi.fn(async () => []),
		parentMergeSource: vi.fn(async () => null),
		dismissParentChanges: vi.fn(async () => ({ dismissed: true as const })),
		create: vi.fn(async () => ({ id: "id-1", publicId: "new-1" })),
		update: vi.fn(async () => ({ publicId: "recipe-1", revision: "r2" })),
		delete: vi.fn(async () => ({ deleted: true as const })),
		fork: vi.fn(async () => ({ id: "id-2", publicId: "fork-1" })),
		recordCook: vi.fn(),
		cancelCook: vi.fn(),
		cookStats: vi.fn(async () => null),
		listCooks: vi.fn(),
		...overrides,
	};
}

function createApp(
	options: { operations?: RecipeOperations; signedIn?: boolean } = {},
) {
	const operations = options.operations ?? createOperations();
	const resolveSession = vi.fn(async () => {
		if (options.signedIn === false) {
			throw new UserFacingError("認証が必要です", { code: "AUTH_REQUIRED" });
		}

		return { db: {} as never, userId: "user-1" };
	});
	const app = createTestApiApp({
		recipes: { resolveSession, createOperations: () => operations },
	});

	return { app, operations };
}

function post(
	app: ReturnType<typeof createApp>["app"],
	path: string,
	body: unknown,
) {
	return app.request(`/api/v1/recipes${path}`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: "Bearer a.b",
		},
		body: JSON.stringify(body),
	});
}

describe("レシピの API", () => {
	it("一覧：/api/v1/recipes で、自分のレシピを返す", async () => {
		const { app, operations } = createApp();
		const response = await app.request("/api/v1/recipes", {
			headers: { authorization: "Bearer a.b" },
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
		expect(operations.list).toHaveBeenCalledOnce();
	});

	it("ログインしていなければ、401（保存しない）", async () => {
		const { app, operations } = createApp({ signedIn: false });
		const response = await post(app, "", createDocument());

		expect(response.status).toBe(401);
		expect(operations.create).not.toHaveBeenCalled();
	});

	it("作成：文書を確かめ、保存の形にしてから渡す", async () => {
		const { app, operations } = createApp();
		const response = await post(app, "", createDocument());

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ id: "id-1", publicId: "new-1" });
		expect(operations.create).toHaveBeenCalledWith(
			expect.objectContaining({ name: "卵焼き", visibility: "private" }),
		);
	});

	it("作成：形の合わない文書は、400 とレシピ用の文（画面に出す文を保つ）", async () => {
		const { app, operations } = createApp();
		const response = await post(app, "", { ...createDocument(), name: "" });

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: {
				code: "INVALID_INPUT",
				message: "レシピの入力内容を確認してください",
			},
		});
		expect(operations.create).not.toHaveBeenCalled();
	});

	it("作成：形では書けない規則（引用元のあるレシピは公開できない）は、具体的な文で 400", async () => {
		const { app, operations } = createApp();
		const response = await post(app, "", {
			...createDocument(),
			visibility: "public",
			sourceUrl: "https://example.com/recipe",
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: {
				code: "INVALID_INPUT",
				message: "引用元のURLがあるレシピは公開できません",
			},
		});
		expect(operations.create).not.toHaveBeenCalled();
	});

	it.each([
		["見つからない", "NOT_FOUND", 404],
		["別の画面で先に保存された", "CONFLICT", 409],
		["公開の審査で断られた", "PUBLICATION_REFUSED", 422],
	] as const)(
		"更新：%s は、コードに合った HTTP の状態にする",
		async (_label, code, status) => {
			const operations = createOperations({
				update: vi.fn(async () => {
					throw new UserFacingError("だめでした", { code });
				}),
			});
			const { app } = createApp({ operations });
			const response = await post(app, "/update", {
				publicId: "recipe-1",
				document: createDocument(),
				expectedRevision: "r1",
			});

			expect(response.status).toBe(status);
			expect(await response.json()).toEqual({
				error: { code, message: "だめでした" },
			});
		},
	);

	it("複製：もとのレシピと、保存の形にした文書を渡す", async () => {
		const { app, operations } = createApp();

		await post(app, "/fork", {
			parentPublicId: "parent-1",
			document: createDocument(),
		});

		expect(operations.fork).toHaveBeenCalledWith({
			parentPublicId: "parent-1",
			recipe: expect.objectContaining({ name: "卵焼き" }),
		});
	});

	it("つくった：別のレシピの印は、400（記録しない）", async () => {
		const { app, operations } = createApp();
		const response = await post(app, "/cooks", {
			recipePublicId: "recipe-1",
			sourceId: "recipe-2:abc",
			yieldText: "2人分",
		});

		expect(response.status).toBe(400);
		expect(operations.recordCook).not.toHaveBeenCalled();
	});

	it("つくった記録の一覧：続きの印を渡す（なければ null）", async () => {
		const { app, operations } = createApp();

		await app.request("/api/v1/recipes/cooks?cursor=c1", {
			headers: { authorization: "Bearer a.b" },
		});
		await app.request("/api/v1/recipes/cooks", {
			headers: { authorization: "Bearer a.b" },
		});

		expect(operations.listCooks).toHaveBeenNthCalledWith(1, "c1");
		expect(operations.listCooks).toHaveBeenNthCalledWith(2, null);
	});

	it("合言葉で開ける：結果を { result } で返す（文字列だけを返さない。アプリが読みやすい形）", async () => {
		const { app, operations } = createApp();
		const response = await post(app, "/unlock", {
			publicId: "recipe-1",
			passphrase: "ちがう",
		});

		expect(await response.json()).toEqual({ result: "wrong" });
		expect(operations.unlock).toHaveBeenCalledWith({
			publicId: "recipe-1",
			passphrase: "ちがう",
		});
	});

	it("合言葉の作り直し：作り直した合言葉を { passphrase } で返す", async () => {
		const { app } = createApp();
		const response = await post(app, "/passphrase/regenerate", {
			publicId: "recipe-1",
		});

		expect(await response.json()).toEqual({
			passphrase: "あたらしい-あいことば",
		});
	});

	it("リンク先：31 個以上は 400（たどらない）", async () => {
		const { app, operations } = createApp();
		const response = await post(app, "/linked", {
			publicIds: Array.from({ length: 31 }, (_, index) => `r-${index}`),
		});

		expect(response.status).toBe(400);
		expect(operations.linked).not.toHaveBeenCalled();
	});

	it("リンクのためのユーザー検索：回数の制限は 429", async () => {
		const operations = createOperations({
			searchLinkableUsers: vi.fn(async () => {
				throw new UserFacingError("検索の回数が多すぎます。", {
					code: "RATE_LIMITED",
				});
			}),
		});
		const { app } = createApp({ operations });
		const response = await app.request(
			"/api/v1/recipes/linkable-users?query=%E3%81%9F",
			{ headers: { authorization: "Bearer a.b" } },
		);

		expect(response.status).toBe(429);
		expect(operations.searchLinkableUsers).toHaveBeenCalledWith("た");
	});

	it("親の変更を取り込まない：親がまた変わっていれば 409 と、画面が見分ける文", async () => {
		const operations = createOperations({
			dismissParentChanges: vi.fn(async () => {
				throw new UserFacingError(PARENT_CHANGED_AGAIN_MESSAGE, {
					code: "CONFLICT",
				});
			}),
		});
		const { app } = createApp({ operations });
		const response = await post(app, "/parent-merge/dismiss", {
			publicId: "child-1",
			parentSnapshot: createRecipeSnapshot(createDocument()),
		});

		expect(response.status).toBe(409);
		expect(await response.json()).toEqual({
			error: { code: "CONFLICT", message: PARENT_CHANGED_AGAIN_MESSAGE },
		});
	});

	it.each([
		["タグなし", "query=%E5%8D%B5", []],
		["タグが1つ（文字列で届く）", "query=&tags=quick", ["quick"]],
		[
			"タグが2つ（配列で届く）",
			"query=&tags=quick&tags=bento",
			["quick", "bento"],
		],
	] as const)(
		"みんなのレシピの検索：%s も、タグを配列にそろえて渡す",
		async (_label, search, tags) => {
			const { app, operations } = createApp();

			await app.request(`/api/v1/recipes/public?${search}`, {
				headers: { authorization: "Bearer a.b" },
			});

			expect(operations.searchPublic).toHaveBeenCalledWith({
				query: search.startsWith("query=%E5%8D%B5") ? "卵" : "",
				cursor: null,
				tags,
			});
		},
	);

	it("うちの人数：保存した値を { householdSize } で返す（null は、設定しない）", async () => {
		const { app, operations } = createApp();
		const response = await post(app, "/household-size", {
			householdSize: null,
		});

		expect(await response.json()).toEqual({ householdSize: null });
		expect(operations.updateHouseholdSize).toHaveBeenCalledWith(null);
	});

	it("うちの人数：整数でない値は 400（保存しない）", async () => {
		const { app, operations } = createApp();
		const response = await post(app, "/household-size", {
			householdSize: 2.5,
		});

		expect(response.status).toBe(400);
		expect(operations.updateHouseholdSize).not.toHaveBeenCalled();
	});
});
