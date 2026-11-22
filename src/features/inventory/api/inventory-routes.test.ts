import { describe, expect, it, vi } from "vitest";

import { createApiApp } from "#/api/create-api-app";
import { UserFacingError } from "#/errors/user-facing-error";
import type { InventoryRepository } from "./inventory-routes";

const itemId = "11111111-1111-4111-8111-111111111111";
const lotA = "22222222-2222-4222-8222-222222222222";
const lotB = "33333333-3333-4333-8333-333333333333";
const transactionId = "44444444-4444-4444-8444-444444444444";

const adjustmentResult = {
	status: "applied" as const,
	transactionId,
	quantity: 3,
	lots: [],
};

function createRepository(
	overrides: Partial<InventoryRepository> = {},
): InventoryRepository {
	return {
		list: vi.fn(async () => []),
		resolveOrCreateInventoryItem: vi.fn(),
		applyAdjustment: vi.fn(async () => adjustmentResult),
		ensureMadeRecipeItem: vi.fn(async () => ({ inventoryItemId: itemId })),
		correctRecipeConsumption: vi.fn(),
		undoRecipeConsumption: vi.fn(),
		changeTrackingMode: vi.fn(),
		updateLot: vi.fn(),
		changeStockUnit: vi.fn(),
		deleteItem: vi.fn(async () => true),
		renameItem: vi.fn(),
		setItemArt: vi.fn(),
		...overrides,
	};
}

function createApp(
	options: { repository?: InventoryRepository; signedIn?: boolean } = {},
) {
	const repository = options.repository ?? createRepository();
	const resolveSession = vi.fn(async () => {
		if (options.signedIn === false) {
			throw new UserFacingError("認証が必要です", { code: "AUTH_REQUIRED" });
		}

		return { db: {} as never, userId: "user-1" };
	});
	const app = createApiApp({
		handleAuth: vi.fn(),
		minimumClientVersions: { android: "0.0.0", ios: "0.0.0", web: "0.0.0" },
		shoppingSync: { resolveSession, createStore: vi.fn() },
		inventory: { resolveSession, createRepository: () => repository },
	});

	return { app, repository, resolveSession };
}

function post(
	app: ReturnType<typeof createApp>["app"],
	path: string,
	body: unknown,
) {
	return app.request(`/api/v1/inventory${path}`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			authorization: "Bearer a.b",
		},
		body: JSON.stringify(body),
	});
}

const adjustment = {
	transactionId,
	inventoryItemId: itemId,
	inputQuantity: 1,
	inputUnitCode: "count",
	stockQuantityPerInputUnit: 1,
	operation: "increase",
	reason: "manual-adjustment",
};

describe("在庫の API", () => {
	it("一覧：画面が思っているユーザーを、セッションの確認に渡す", async () => {
		const { app, repository, resolveSession } = createApp();
		const response = await app.request(
			"/api/v1/inventory/items?expectedUserId=user-1",
			{ headers: { authorization: "Bearer a.b" } },
		);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual([]);
		expect(repository.list).toHaveBeenCalledOnce();
		expect(resolveSession).toHaveBeenCalledWith(expect.any(Headers), {
			expectedUserId: "user-1",
		});
	});

	it("ログインしていなければ、401（読み書きしない）", async () => {
		const { app, repository } = createApp({ signedIn: false });
		const response = await post(app, "/adjustments", adjustment);

		expect(response.status).toBe(401);
		expect(repository.applyAdjustment).not.toHaveBeenCalled();
	});

	it("増減：形と規則を確かめてから、repository に渡す", async () => {
		const { app, repository } = createApp();
		const response = await post(app, "/adjustments", adjustment);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual(adjustmentResult);
		expect(repository.applyAdjustment).toHaveBeenCalledWith(adjustment);
	});

	it("増減：形では書けない規則（増やすときのロットは1つだけ）に合わなければ、400 と INVALID_INPUT", async () => {
		const { app, repository } = createApp();
		const response = await post(app, "/adjustments", {
			...adjustment,
			allocations: [
				{ lotId: lotA, quantity: 1 },
				{ lotId: lotB, quantity: 1 },
			],
		});

		expect(response.status).toBe(400);
		expect(await response.json()).toMatchObject({
			error: { code: "INVALID_INPUT" },
		});
		expect(repository.applyAdjustment).not.toHaveBeenCalled();
	});

	it("増減：画面から送れない理由（できあがりを入れる recipe-production）は、400", async () => {
		const { app, repository } = createApp();
		const response = await post(app, "/adjustments", {
			...adjustment,
			reason: "recipe-production",
		});

		expect(response.status).toBe(400);
		expect(repository.applyAdjustment).not.toHaveBeenCalled();
	});

	it.each([
		["見つからない", "NOT_FOUND", 404],
		["今の状態と合わない（不足など）", "CONFLICT", 409],
	] as const)(
		"repository のエラー（%s）は、コードに合った HTTP の状態にする",
		async (_label, code, status) => {
			const repository = createRepository({
				applyAdjustment: vi.fn(async () => {
					throw new UserFacingError("だめでした", { code });
				}),
			});
			const { app } = createApp({ repository });
			const response = await post(app, "/adjustments", adjustment);

			expect(response.status).toBe(status);
			expect(await response.json()).toEqual({
				error: { code, message: "だめでした" },
			});
		},
	);

	it("名前の変更：空の名前は null（食材の名前に戻す）にそろえる", async () => {
		const { app, repository } = createApp();

		await post(app, "/items/rename", {
			inventoryItemId: itemId,
			displayName: " ",
		});

		expect(repository.renameItem).toHaveBeenCalledWith({
			inventoryItemId: itemId,
			displayName: null,
		});
	});

	it("作り置き：できあがりの食材を用意して、recipe-production で入れる", async () => {
		const { app, repository } = createApp();
		const response = await post(app, "/made-recipes/stock", {
			recipePublicId: "recipe-1",
			transactionId,
			sourceId: "cook-1",
			quantity: 0.5,
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({
			inventoryItemId: itemId,
			...adjustmentResult,
		});
		expect(repository.ensureMadeRecipeItem).toHaveBeenCalledWith("recipe-1");
		expect(repository.applyAdjustment).toHaveBeenCalledWith(
			expect.objectContaining({
				inventoryItemId: itemId,
				inputQuantity: 0.5,
				reason: "recipe-production",
				sourceId: "cook-1",
			}),
		);
	});

	it("元に戻す：操作の印と、1行ずつ戻す食材を渡す", async () => {
		const { app, repository } = createApp();

		await post(app, "/recipe-consumptions/undo", {
			sourceId: "cook-1",
			inventoryItemIds: [itemId],
		});

		expect(repository.undoRecipeConsumption).toHaveBeenCalledWith("cook-1", [
			itemId,
		]);
	});
});
