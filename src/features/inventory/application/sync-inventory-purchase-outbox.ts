import {
	classifyRequestError,
	type RequestFailureKind,
} from "#/errors/classify-request-error";
import { describeError } from "#/errors/user-facing-error";
import type { InventoryPurchaseOwnerScope } from "./inventory-purchase-outbox";
import type { InventoryPurchaseOutboxRepository } from "./inventory-purchase-outbox-repository";
import type { RecordInventoryPurchaseInput } from "./record-inventory-purchase";

export interface InventoryPurchaseSender {
	// ownerScope：その購入をした人（サーバーは、Cookie の人と違えば断る）。
	send(
		payload: RecordInventoryPurchaseInput,
		ownerScope: `user:${string}`,
	): Promise<void>;
}

// 送れなかった購入のうち、ほかの購入を止めずに、飛ばしたもの（内容で断られた・サーバーの中の失敗）。
export type InventoryPurchaseFailure = {
	entryId: string;
	ingredientName: string;
	kind: Extract<RequestFailureKind, "rejected" | "server">;
	message: string;
};

export type SyncInventoryPurchaseOutboxResult = {
	syncedCount: number;
	failures: InventoryPurchaseFailure[];
	// 途中で止めた理由（届かない・ログインの状態。どの購入でも同じ結果になるので、残りは次の機会に送る）。
	stoppedBy: Extract<RequestFailureKind, "offline" | "account"> | null;
};

// 送り残しがないか。
export function isPurchaseOutboxSynced(
	result: SyncInventoryPurchaseOutboxResult,
): boolean {
	return result.stoppedBy === null && result.failures.length === 0;
}

// 端末に貯めた購入を、古い順に送る。
// - 届かない・ログインの状態が違う：そこで止める（後ろの購入も、同じ理由で通らない）。
// - 内容で断られた・サーバーの中の失敗：その購入に印を付けて、後ろの購入は送り続ける（1件のために、全部を止めない）。
export async function syncInventoryPurchaseOutbox(
	ownerScope: InventoryPurchaseOwnerScope,
	outboxRepository: InventoryPurchaseOutboxRepository,
	sender: InventoryPurchaseSender,
): Promise<SyncInventoryPurchaseOutboxResult> {
	const result: SyncInventoryPurchaseOutboxResult = {
		syncedCount: 0,
		failures: [],
		stoppedBy: null,
	};

	if (ownerScope === "guest") {
		return result;
	}

	const entries = await outboxRepository.list(ownerScope);

	for (const entry of entries) {
		try {
			await sender.send(entry.payload, ownerScope);
			await outboxRepository.remove(entry.id);
			result.syncedCount += 1;
		} catch (error) {
			const kind = classifyRequestError(error);
			const message = describeError(error, "送信に失敗しました");

			// ログインの状態が違うのは、購入のせいではないので、印を付けない。
			if (kind !== "account") {
				await outboxRepository.markFailed(entry.id, message);
			}

			if (kind === "offline" || kind === "account") {
				result.stoppedBy = kind;

				return result;
			}

			result.failures.push({
				entryId: entry.id,
				ingredientName: entry.payload.ingredientName,
				kind,
				message,
			});
		}
	}

	return result;
}
