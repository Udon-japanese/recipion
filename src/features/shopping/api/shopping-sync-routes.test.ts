import { describe, expect, it, vi } from "vitest";

import { createTestApiApp } from "#/api/testing/create-test-api-app";
import { UserFacingError } from "#/errors/user-facing-error";
import { createShoppingItem } from "../domain/shopping-item";
import type { ShoppingSyncStore } from "./shopping-sync-routes";

const item = createShoppingItem({ name: "卵" });

const pushRecord = {
	kind: "item",
	id: item.id,
	deleted: false,
	data: item,
	changeId: "change-1",
	baseVersion: 0,
	unackedChangeIds: [],
};

function createApp(
	options: { store?: Partial<ShoppingSyncStore>; signedIn?: boolean } = {},
) {
	const store: ShoppingSyncStore = {
		push: vi.fn(async () => [{ status: "applied", version: 1 } as const]),
		pull: vi.fn(async () => ({ records: [], cursor: 5, hasMore: false })),
		...options.store,
	};
	const resolveSession = vi.fn(
		async (_headers: Headers, sessionOptions?: { expectedUserId?: string }) => {
			if (options.signedIn === false) {
				throw new UserFacingError("認証が必要です", { code: "AUTH_REQUIRED" });
			}

			if (
				sessionOptions?.expectedUserId !== undefined &&
				sessionOptions.expectedUserId !== "user-1"
			) {
				throw new UserFacingError("アカウントが変わりました", {
					code: "ACCOUNT_CHANGED",
				});
			}

			return { db: {} as never, userId: "user-1" };
		},
	);
	const app = createTestApiApp({
		shoppingSync: { resolveSession, createStore: () => store },
	});

	return { app, store, resolveSession };
}

function push(app: ReturnType<typeof createApp>["app"], body: unknown) {
	return app.request("/api/v1/shopping/sync/push", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: "Bearer a.b",
		},
		body: JSON.stringify(body),
	});
}

describe("POST /api/v1/shopping/sync/push", () => {
	it("送った行を当て、結果を送った順に返す", async () => {
		const { app, store, resolveSession } = createApp();
		const response = await push(app, {
			expectedUserId: "user-1",
			records: [pushRecord],
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			results: [{ status: "applied", version: 1 }],
		});
		expect(store.push).toHaveBeenCalledWith([pushRecord]);
		expect(resolveSession).toHaveBeenCalledWith(expect.any(Headers), {
			expectedUserId: "user-1",
		});
	});

	it("ログインしていなければ、401 と AUTH_REQUIRED（行は当てない）", async () => {
		const { app, store } = createApp({ signedIn: false });
		const response = await push(app, { records: [pushRecord] });

		expect(response.status).toBe(401);
		expect(await response.json()).toMatchObject({
			error: { code: "AUTH_REQUIRED" },
		});
		expect(store.push).not.toHaveBeenCalled();
	});

	it("画面が思っているユーザーと違えば、403 と ACCOUNT_CHANGED（別の人のメモに書かない）", async () => {
		const { app, store } = createApp();
		const response = await push(app, {
			expectedUserId: "user-2",
			records: [pushRecord],
		});

		expect(response.status).toBe(403);
		expect(await response.json()).toMatchObject({
			error: { code: "ACCOUNT_CHANGED" },
		});
		expect(store.push).not.toHaveBeenCalled();
	});

	it.each([
		["中身の形が違う", { ...pushRecord, data: { ...item, quantity: 0 } }],
		["知らない種類", { ...pushRecord, kind: "recipe" }],
		["送るときの印がない", { ...pushRecord, changeId: undefined }],
		["行の ID が中身と違う", { ...pushRecord, id: "other-id" }],
	])(
		"1行でも合わなければ、400 と INVALID_INPUT で、まとめて断る（%s）",
		async (_label, bad) => {
			const { app, store } = createApp();
			const response = await push(app, { records: [pushRecord, bad] });

			expect(response.status).toBe(400);
			expect(await response.json()).toMatchObject({
				error: { code: "INVALID_INPUT" },
			});
			expect(store.push).not.toHaveBeenCalled();
		},
	);

	it("101行は断る", async () => {
		const { app, store } = createApp();
		const response = await push(app, {
			records: Array.from({ length: 101 }, () => pushRecord),
		});

		expect(response.status).toBe(400);
		expect(store.push).not.toHaveBeenCalled();
	});
});

describe("GET /api/v1/shopping/sync/pull", () => {
	it("受け取り済みの版より新しい行を、1回分の上限で読む", async () => {
		const { app, store } = createApp();
		const response = await app.request(
			"/api/v1/shopping/sync/pull?after=4&expectedUserId=user-1",
			{ headers: { authorization: "Bearer a.b" } },
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			records: [],
			cursor: 5,
			hasMore: false,
		});
		expect(store.pull).toHaveBeenCalledWith(4, 500);
	});

	it.each(["-1", "1.5", "abc", ""])(
		"after が 0 以上の整数でなければ、400（%s）",
		async (after) => {
			const { app, store } = createApp();
			const response = await app.request(
				`/api/v1/shopping/sync/pull?after=${after}`,
				{ headers: { authorization: "Bearer a.b" } },
			);

			expect(response.status).toBe(400);
			expect(store.pull).not.toHaveBeenCalled();
		},
	);
});
