import { apiClient, readApiResponse } from "#/api/client";
import { userIdOfOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { createShoppingSyncRequester } from "../application/request-shopping-sync";
import {
	type ShoppingSyncRemote,
	syncShoppingMemo,
} from "../application/sync-shopping-memo";
import { createDexieShoppingSyncStore } from "./dexie-shopping-sync-store";
import { setShoppingSyncStatus as setStatus } from "./shopping-sync-status";

type UserScope = `user:${string}`;

const apiShoppingSyncRemote: ShoppingSyncRemote = {
	async push(ownerScope, records) {
		const { results } = await readApiResponse(
			await apiClient.api.v1.shopping.sync.push.$post({
				json: {
					expectedUserId: userIdOfOwnerScope(ownerScope),
					records: [...records],
				},
			}),
		);

		return results;
	},
	async pull(ownerScope, after) {
		return readApiResponse(
			await apiClient.api.v1.shopping.sync.pull.$get({
				query: {
					expectedUserId: userIdOfOwnerScope(ownerScope),
					after: String(after),
				},
			}),
		);
	},
};

function syncOnce(ownerScope: UserScope) {
	const run = () =>
		syncShoppingMemo(
			ownerScope,
			createDexieShoppingSyncStore(),
			apiShoppingSyncRemote,
		);
	const locks = typeof navigator === "undefined" ? undefined : navigator.locks;

	// 別のタブとは、Web Locks で順番にする（使えない環境では、このタブの中だけ）。
	return locks
		? locks.request(`recipion:shopping-sync:${ownerScope}`, run)
		: run();
}

// 買い物メモを同期する（API を呼ぶので、画面の部品には、ルートから渡す）。
// 結果は、失敗の種類（成功は null）。例外にはしない。
export const syncDexieShoppingMemo = createShoppingSyncRequester({
	syncOnce,
	onStart: (ownerScope) =>
		setStatus((status) => ({ ...status, ownerScope, isSyncing: true })),
	onSettled: (ownerScope, failure) =>
		setStatus({ ownerScope, isSyncing: false, failure }),
});
