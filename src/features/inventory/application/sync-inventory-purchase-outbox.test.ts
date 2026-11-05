import { describe, expect, it, vi } from "vitest";
import {
	ACCOUNT_CHANGED_MESSAGE,
	AUTH_REQUIRED_MESSAGE,
	GENERIC_ERROR_MESSAGE,
	UserFacingError,
} from "#/errors/user-facing-error";
import { createInventoryPurchaseOutboxEntry } from "./inventory-purchase-outbox";
import type { InventoryPurchaseOutboxRepository } from "./inventory-purchase-outbox-repository";
import {
	type InventoryPurchaseSender,
	syncInventoryPurchaseOutbox,
} from "./sync-inventory-purchase-outbox";

function createEntry(
	transactionId: string,
	createdAt: string,
	ingredientName = "卵",
) {
	return createInventoryPurchaseOutboxEntry(
		{
			transactionId,
			shoppingItemId: "1fc94e80-a9cf-4458-b0e6-3d72550cce06",
			ingredientName,
			stockUnitCode: "count",
			stockUnitLabel: "個",
			trackingMode: "exact",
			inputQuantity: 1,
			inputUnitCode: "pack",
			stockQuantityPerInputUnit: 10,
		},
		"user:user-id",
		new Date(createdAt),
	);
}

const firstEntry = createEntry(
	"71af9bc7-03ed-4df4-a783-a45e743a81f7",
	"2026-09-22T12:00:00.000Z",
	"卵",
);
const secondEntry = createEntry(
	"81af9bc7-03ed-4df4-a783-a45e743a81f8",
	"2026-09-22T13:00:00.000Z",
	"牛乳",
);

function createOutbox(): InventoryPurchaseOutboxRepository {
	return {
		enqueue: vi.fn(),
		list: vi.fn().mockResolvedValue([firstEntry, secondEntry]),
		markFailed: vi.fn(),
		reassignOwnerScope: vi.fn().mockResolvedValue(0),
		remove: vi.fn(),
	};
}

describe("syncInventoryPurchaseOutbox", () => {
	it("送れた購入を、古い順に送って、キューから消す（その人の印を付けて送る）", async () => {
		const outbox = createOutbox();
		const sender: InventoryPurchaseSender = {
			send: vi.fn().mockResolvedValue(undefined),
		};

		await expect(
			syncInventoryPurchaseOutbox("user:user-id", outbox, sender),
		).resolves.toEqual({ syncedCount: 2, failures: [], stoppedBy: null });

		expect(sender.send).toHaveBeenNthCalledWith(
			1,
			firstEntry.payload,
			"user:user-id",
		);
		expect(sender.send).toHaveBeenNthCalledWith(
			2,
			secondEntry.payload,
			"user:user-id",
		);
		expect(outbox.remove).toHaveBeenCalledTimes(2);
	});

	it("ゲストの購入は、送らない", async () => {
		const outbox = createOutbox();
		const sender: InventoryPurchaseSender = { send: vi.fn() };

		await expect(
			syncInventoryPurchaseOutbox("guest", outbox, sender),
		).resolves.toEqual({ syncedCount: 0, failures: [], stoppedBy: null });
		expect(sender.send).not.toHaveBeenCalled();
	});

	// 1件目が失敗したときの、止めるか・印を付けるか・2件目を送るか。
	it.each([
		{
			label: "届かない（ブラウザの英語のエラー）",
			error: new TypeError("Failed to fetch"),
			stoppedBy: "offline",
			marked: true,
			sendsSecond: false,
		},
		{
			label: "ログインしていない",
			error: new UserFacingError(AUTH_REQUIRED_MESSAGE),
			stoppedBy: "account",
			marked: false,
			sendsSecond: false,
		},
		{
			label: "別のアカウントになった",
			error: new UserFacingError(ACCOUNT_CHANGED_MESSAGE),
			stoppedBy: "account",
			marked: false,
			sendsSecond: false,
		},
		{
			label: "内容で断られた（換算できない）",
			error: new UserFacingError(
				"卵の在庫の単位（g）に買った量を換算できません",
			),
			stoppedBy: null,
			marked: true,
			sendsSecond: true,
		},
		{
			label: "サーバーの中の失敗",
			error: new UserFacingError(GENERIC_ERROR_MESSAGE),
			stoppedBy: null,
			marked: true,
			sendsSecond: true,
		},
	] as const)(
		"1件目の失敗が「$label」",
		async ({ error, stoppedBy, marked, sendsSecond }) => {
			const outbox = createOutbox();
			const sender: InventoryPurchaseSender = {
				send: vi
					.fn()
					.mockRejectedValueOnce(error)
					.mockResolvedValueOnce(undefined),
			};

			const result = await syncInventoryPurchaseOutbox(
				"user:user-id",
				outbox,
				sender,
			);

			expect(result.stoppedBy).toBe(stoppedBy);
			expect(outbox.markFailed).toHaveBeenCalledTimes(marked ? 1 : 0);
			expect(sender.send).toHaveBeenCalledTimes(sendsSecond ? 2 : 1);
			expect(result.syncedCount).toBe(sendsSecond ? 1 : 0);
			expect(result.failures.map((failure) => failure.ingredientName)).toEqual(
				sendsSecond ? ["卵"] : [],
			);
			expect(outbox.remove).toHaveBeenCalledTimes(sendsSecond ? 1 : 0);
		},
	);

	it("内容で断られた購入は、理由の文を残す", async () => {
		const outbox = createOutbox();
		const message = "卵の在庫の単位（g）に買った量を換算できません";
		const sender: InventoryPurchaseSender = {
			send: vi
				.fn()
				.mockRejectedValueOnce(new UserFacingError(message))
				.mockResolvedValueOnce(undefined),
		};

		const result = await syncInventoryPurchaseOutbox(
			"user:user-id",
			outbox,
			sender,
		);

		expect(result.failures).toEqual([
			{
				entryId: firstEntry.id,
				ingredientName: "卵",
				kind: "rejected",
				message,
			},
		]);
		expect(outbox.markFailed).toHaveBeenCalledWith(firstEntry.id, message);
	});
});
