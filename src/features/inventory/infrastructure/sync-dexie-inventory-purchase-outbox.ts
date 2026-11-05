import type { InventoryPurchaseOwnerScope } from "../application/inventory-purchase-outbox";
import { notifyPurchaseSyncStarted } from "../application/purchase-sync-events";
import {
	type SyncInventoryPurchaseOutboxResult,
	syncInventoryPurchaseOutbox,
} from "../application/sync-inventory-purchase-outbox";
import { createDexieInventoryPurchaseOutboxRepository } from "./dexie-inventory-purchase-outbox-repository";
import { tanstackInventoryPurchaseSender } from "./tanstack-inventory-purchase-sender";

const lockName = "recipion:inventory-purchase-outbox";

// このタブで送っている最中の同期（所有者ごと）。購入確定のあとの送信と、画面の部品の送信が重なっても、1回にまとめる。
const running = new Map<
	InventoryPurchaseOwnerScope,
	Promise<SyncInventoryPurchaseOutboxResult>
>();

function syncOnce(ownerScope: InventoryPurchaseOwnerScope) {
	return syncInventoryPurchaseOutbox(
		ownerScope,
		createDexieInventoryPurchaseOutboxRepository(),
		tanstackInventoryPurchaseSender,
	);
}

// 同じ購入を、同時に2回送らない（サーバーは取引 ID で二重には入れないが、同時の2本目は失敗に見える）。
// 別のタブとは、Web Locks で順番にする（使えない環境では、このタブの中だけ）。
export function syncDexieInventoryPurchaseOutbox(
	ownerScope: InventoryPurchaseOwnerScope,
): Promise<SyncInventoryPurchaseOutboxResult> {
	const current = running.get(ownerScope);

	if (current) {
		return current;
	}

	notifyPurchaseSyncStarted();

	const locks = typeof navigator === "undefined" ? undefined : navigator.locks;
	const started = (
		locks
			? locks.request(lockName, () => syncOnce(ownerScope))
			: syncOnce(ownerScope)
	).finally(() => {
		running.delete(ownerScope);
	});

	running.set(ownerScope, started);

	return started;
}
