import { useEffect, useState, useSyncExternalStore } from "react";
import { Note } from "#/components/note/note";
import type { InventoryPurchaseOwnerScope } from "#/features/inventory/application/inventory-purchase-outbox";
import { watchShoppingSyncPending } from "../infrastructure/dexie-shopping-sync-store";
import {
	type ShoppingSyncStatus,
	shoppingSyncStatusStore,
} from "../infrastructure/shopping-sync-status";

type ShoppingSyncNoticeProps = {
	ownerScope: InventoryPurchaseOwnerScope;
	statusStore?: {
		getSnapshot: () => ShoppingSyncStatus;
		subscribe: (listener: () => void) => () => void;
	};
	watchPending?: typeof watchShoppingSyncPending;
};

// 買い物メモの上に、送っても断られた変更があるときだけ出す（ふだんは、何も出さない）。
export function ShoppingSyncNotice({
	ownerScope,
	statusStore = shoppingSyncStatusStore,
	watchPending = watchShoppingSyncPending,
}: ShoppingSyncNoticeProps) {
	const status = useSyncExternalStore(
		statusStore.subscribe,
		statusStore.getSnapshot,
		statusStore.getSnapshot,
	);
	const [pendingCount, setPendingCount] = useState(0);
	const isUser = ownerScope !== "guest";

	useEffect(() => {
		if (ownerScope === "guest") {
			setPendingCount(0);

			return;
		}

		return watchPending(ownerScope, setPendingCount, () => setPendingCount(0));
	}, [ownerScope, watchPending]);

	// 通信がない・サーバーの一時的な障害は、黙って送り直す（端末に保存してあるので、書いた内容は消えない）。
	// ログインが切れたときは、ログインの画面の流れに任せる。
	// 出すのは、内容で断られたとき（待っても直らず、ほかの端末と食い違ったままになる）だけ。
	if (
		!isUser ||
		status.ownerScope !== ownerScope ||
		status.failure !== "rejected" ||
		pendingCount === 0
	) {
		return null;
	}

	return (
		<Note tone="warn">
			{`買い物メモの変更（${pendingCount}件）を、ほかの端末に反映できませんでした`}
		</Note>
	);
}
