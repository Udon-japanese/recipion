import { afterEach, describe, expect, it } from "vitest";

import { LocalDatabase } from "#/local-db/database";

import { createDexieInventoryPurchaseOutboxRepository } from "./dexie-inventory-purchase-outbox-repository";
import {
	createInventoryPurchaseOutboxEntry,
	type InventoryPurchaseOwnerScope,
} from "./inventory-purchase-outbox";

const databases: LocalDatabase[] = [];

function createTestContext(ownerScope: InventoryPurchaseOwnerScope = "guest") {
	const database = new LocalDatabase(
		`inventory-outbox-test-${crypto.randomUUID()}`,
	);
	const repository = createDexieInventoryPurchaseOutboxRepository(database);

	databases.push(database);

	const payload = {
		transactionId: "71af9bc7-03ed-4df4-a783-a45e743a81f7",
		shoppingItemId: "1fc94e80-a9cf-4458-b0e6-3d72550cce06",
		ingredientName: "卵",
		stockUnitCode: "count" as const,
		stockUnitLabel: "個",
		trackingMode: "exact" as const,
		inputQuantity: 1,
		inputUnitCode: "pack",
		stockQuantityPerInputUnit: 10,
	};

	return {
		database,
		repository,
		entry: createInventoryPurchaseOutboxEntry(
			payload,
			ownerScope,
			new Date("2026-09-22T12:00:00.000Z"),
		),
	};
}

afterEach(async () => {
	await Promise.all(databases.splice(0).map((database) => database.delete()));
});

describe("dexieInventoryPurchaseOutboxRepository", () => {
	it("送信待ち操作を追加して取得する", async () => {
		const { repository, entry } = createTestContext();

		await repository.enqueue(entry);

		await expect(repository.list("guest")).resolves.toEqual([entry]);
	});

	it("同じ取引IDを重複追加しない", async () => {
		const { repository, entry } = createTestContext();

		await repository.enqueue(entry);
		await repository.enqueue(entry);

		await expect(repository.list("guest")).resolves.toHaveLength(1);
	});

	it("別の所有範囲の操作を返さない", async () => {
		const { repository, entry } = createTestContext("user:user-id");

		await repository.enqueue(entry);

		await expect(repository.list("guest")).resolves.toEqual([]);
	});

	it("送信失敗を記録する", async () => {
		const { repository, entry } = createTestContext();

		await repository.enqueue(entry);
		await repository.markFailed(
			entry.id,
			"ネットワークエラー",
			new Date("2026-09-22T13:00:00.000Z"),
		);

		const [storedEntry] = await repository.list("guest");

		expect(storedEntry).toMatchObject({
			status: "failed",
			attemptCount: 1,
			lastAttemptAt: "2026-09-22T13:00:00.000Z",
			lastError: "ネットワークエラー",
			updatedAt: "2026-09-22T13:00:00.000Z",
		});
	});

	it("送信済み操作を削除する", async () => {
		const { repository, entry } = createTestContext();

		await repository.enqueue(entry);
		await repository.remove(entry.id);

		await expect(repository.list("guest")).resolves.toEqual([]);
	});

	it("ゲストの在庫反映待ちをユーザーへ引き継ぐ", async () => {
		const { repository, entry } = createTestContext("guest");

		await repository.enqueue(entry);

		const movedCount = await repository.reassignOwnerScope(
			"guest",
			"user:user-id",
			new Date("2026-09-22T20:00:00.000Z"),
		);

		expect(movedCount).toBe(1);

		await expect(repository.list("guest")).resolves.toEqual([]);

		await expect(repository.list("user:user-id")).resolves.toEqual([
			{
				...entry,
				ownerScope: "user:user-id",
				updatedAt: "2026-09-22T20:00:00.000Z",
			},
		]);
	});
});
