import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "#/components/button/button";
import { Note } from "#/components/note/note";
import type { InventoryPurchaseOwnerScope } from "../application/inventory-purchase-outbox";
import type { SyncInventoryPurchaseOutboxResult } from "../application/sync-inventory-purchase-outbox";

type SyncPurchases = (
	ownerScope: InventoryPurchaseOwnerScope,
) => Promise<SyncInventoryPurchaseOutboxResult>;

type InventoryPurchaseSyncProps = {
	ownerScope: InventoryPurchaseOwnerScope | null;
	syncPurchases: SyncPurchases;
};

type SyncStatus = "idle" | "syncing" | "waiting" | "synced";

export function InventoryPurchaseSync({
	ownerScope,
	syncPurchases,
}: InventoryPurchaseSyncProps) {
	const isSyncingRef = useRef(false);
	const [status, setStatus] = useState<SyncStatus>("idle");
	const [syncedCount, setSyncedCount] = useState(0);

	const runSync = useCallback(async () => {
		if (!ownerScope || ownerScope === "guest" || isSyncingRef.current) {
			return;
		}

		isSyncingRef.current = true;
		setStatus("syncing");

		try {
			const result = await syncPurchases(ownerScope);

			setSyncedCount(result.syncedCount);
			setStatus(result.failedEntryId ? "waiting" : "synced");
		} catch {
			setStatus("waiting");
		} finally {
			isSyncingRef.current = false;
		}
	}, [ownerScope, syncPurchases]);

	useEffect(() => {
		void runSync();
	}, [runSync]);

	useEffect(() => {
		function handleOnline() {
			void runSync();
		}

		window.addEventListener("online", handleOnline);

		return () => {
			window.removeEventListener("online", handleOnline);
		};
	}, [runSync]);

	if (!ownerScope || ownerScope === "guest") {
		return null;
	}

	if (status === "idle") {
		return null;
	}

	if (status === "syncing") {
		return (
			<Note tone="info" spinning>
				在庫を同期しています…
			</Note>
		);
	}

	if (status === "waiting") {
		return (
			<Note
				tone="warn"
				action={
					<Button variant="secondary" size="sm" onClick={() => void runSync()}>
						在庫同期を再試行
					</Button>
				}
			>
				未反映の在庫があります
			</Note>
		);
	}

	return syncedCount > 0 ? (
		<Note tone="success">{syncedCount}件の在庫を反映しました</Note>
	) : null;
}
