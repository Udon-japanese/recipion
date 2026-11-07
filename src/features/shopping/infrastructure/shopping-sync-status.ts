import type { RequestFailureKind } from "#/errors/classify-request-error";

type UserScope = `user:${string}`;

// 同期の、いまの状態（買い物メモの画面に出す）。
export type ShoppingSyncStatus = {
	ownerScope: UserScope | null;
	isSyncing: boolean;
	// 最後の同期が失敗した理由（成功したら null）。
	failure: RequestFailureKind | null;
};

let status: ShoppingSyncStatus = {
	ownerScope: null,
	isSyncing: false,
	failure: null,
};
const listeners = new Set<() => void>();

export function setShoppingSyncStatus(
	next:
		| ShoppingSyncStatus
		| ((current: ShoppingSyncStatus) => ShoppingSyncStatus),
) {
	status = typeof next === "function" ? next(status) : next;

	for (const listener of listeners) {
		listener();
	}
}

export const shoppingSyncStatusStore = {
	getSnapshot: () => status,
	subscribe(listener: () => void) {
		listeners.add(listener);

		return () => {
			listeners.delete(listener);
		};
	},
	// ログイン状態を確かめられない間は、送らずに待つ（通信がないのと同じに見せる）。
	markWaiting(ownerScope: UserScope) {
		setShoppingSyncStatus({ ownerScope, isSyncing: false, failure: "offline" });
	},
};
