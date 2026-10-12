import { describe, expect, it, vi } from "vitest";
import { buildInventoryListItem } from "#/test/builders/build-inventory-list-item";
import { createFakeInventoryCacheRepository } from "#/test/fakes/fake-inventory-cache-repository";
import type { RecipeConsumptionRow } from "../domain/plan-recipe-consumption";
import {
	runRecipeConsumption,
	startRecipeConsumption,
	undoRecipeConsumptionWithCache,
} from "./consume-recipe-ingredients";

function row(
	needId: string,
	inventoryItemId: string | null,
	deduct: number | null,
): RecipeConsumptionRow {
	return {
		need: {
			id: needId,
			name: needId,
			quantity: 1,
			unitLabel: null,
			amountText: null,
		},
		status: deduct === null ? "unmeasurable" : "consume",
		target: inventoryItemId
			? {
					inventoryItemId,
					name: needId,
					stockUnitCode: "count",
					stockUnitLabel: "個",
				}
			: null,
		deduct,
		required: deduct,
		viaStandIn: false,
	};
}

function createIds() {
	let next = 0;

	return () => `id-${++next}`;
}

describe("startRecipeConsumption", () => {
	it("引く行だけを、取引 ID つきの操作にする", () => {
		const operation = startRecipeConsumption(
			"recipe-1",
			[row("卵", "inv-1", 2), row("塩", null, null), row("牛乳", "inv-2", 100)],
			createIds(),
		);

		expect(operation.sourceId).toBe("recipe-1:id-1");
		expect(
			operation.entries.map((entry) => [
				entry.needId,
				entry.quantity,
				entry.transactionId,
			]),
		).toEqual([
			["卵", 2, "id-2"],
			["牛乳", 100, "id-3"],
		]);
	});
});

describe("runRecipeConsumption", () => {
	const lots = [
		{
			id: "lot-1",
			quantity: 4,
			acquiredOn: "2026-10-01",
			storage: null,
			expiresOn: null,
			expiryKind: null,
			expirySource: null,
			createdAt: "2026-10-01T00:00:00.000Z",
		},
	];

	it("在庫から引き、キャッシュにも反映する。1行が失敗しても残りを続け、失敗した行だけやり直せる", async () => {
		const cache = createFakeInventoryCacheRepository([
			{
				ownerScope: "user:u",
				items: [
					buildInventoryListItem({ inventoryItemId: "inv-1", quantity: 6 }),
					buildInventoryListItem({ inventoryItemId: "inv-2", quantity: 9 }),
				],
				cachedAt: "2026-10-01T00:00:00.000Z",
			},
		]);
		const operation = startRecipeConsumption(
			"recipe-1",
			[row("a", "inv-1", 2), row("b", "inv-2", 3)],
			createIds(),
		);
		const adjust = vi
			.fn()
			.mockResolvedValueOnce({
				status: "applied",
				transactionId: "x",
				quantity: 4,
				lots,
			})
			.mockRejectedValueOnce(new Error("offline"))
			.mockResolvedValueOnce({
				status: "applied",
				transactionId: "y",
				quantity: 6,
				lots,
			});

		const first = await runRecipeConsumption(
			"user:u",
			operation,
			adjust,
			cache,
		);

		expect(first.map((result) => [result.needId, result.ok])).toEqual([
			["a", true],
			["b", false],
		]);
		expect(adjust.mock.calls[0]?.[0]).toMatchObject({
			operation: "decrease",
			reason: "recipe-consumption",
			sourceType: "recipe",
			sourceId: operation.sourceId,
			inputQuantity: 2,
		});

		const retry = await runRecipeConsumption(
			"user:u",
			operation,
			adjust,
			cache,
			new Set(["b"]),
		);

		expect(retry.map((result) => result.ok)).toEqual([true]);
		// 再送は、最初と同じ取引 ID（二重に引かない）。
		expect(adjust.mock.calls[2]?.[0].transactionId).toBe(
			operation.entries[1]?.transactionId,
		);

		const cached = await cache.find("user:u");

		expect(cached?.items.map((item) => item.quantity)).toEqual([4, 6]);
	});
});

describe("undoRecipeConsumptionWithCache", () => {
	it("戻した食材の数量を、キャッシュに反映する", async () => {
		const cache = createFakeInventoryCacheRepository([
			{
				ownerScope: "user:u",
				items: [
					buildInventoryListItem({ inventoryItemId: "inv-1", quantity: 4 }),
				],
				cachedAt: "2026-10-01T00:00:00.000Z",
			},
		]);

		const result = await undoRecipeConsumptionWithCache(
			"user:u",
			"recipe-1:id-1",
			async () => ({
				status: "undone",
				items: [{ inventoryItemId: "inv-1", quantity: 6, lots: [] }],
			}),
			cache,
		);

		expect(result.status).toBe("undone");
		expect((await cache.find("user:u"))?.items[0]?.quantity).toBe(6);
	});

	it("サーバーの取り消しに失敗したら、エラーにして、キャッシュを変えない", async () => {
		const cache = createFakeInventoryCacheRepository([
			{
				ownerScope: "user:u",
				items: [
					buildInventoryListItem({ inventoryItemId: "inv-1", quantity: 4 }),
				],
				cachedAt: "2026-10-01T00:00:00.000Z",
			},
		]);

		await expect(
			undoRecipeConsumptionWithCache(
				"user:u",
				"recipe-1:id-1",
				async () => {
					throw new Error("offline");
				},
				cache,
			),
		).rejects.toThrow("offline");
		expect((await cache.find("user:u"))?.items[0]?.quantity).toBe(4);
	});
});
