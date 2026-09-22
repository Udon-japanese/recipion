import { useCallback, useEffect, useRef, useState } from "react";

import type { SyncInventoryPurchaseOutboxResult } from "../application/sync-inventory-purchase-outbox";
import type { InventoryPurchaseOwnerScope } from "../infrastructure/inventory-purchase-outbox";
import * as styles from "./inventory-purchase-sync.css";

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

	return (
		<section className={styles.container} aria-live="polite">
			{status === "syncing" ? (
				<p className={styles.message}>在庫を同期しています…</p>
			) : null}

			{status === "waiting" ? (
				<>
					<p className={styles.message}>未反映の在庫があります</p>

					<button
						className={styles.retryButton}
						type="button"
						onClick={() => void runSync()}
					>
						在庫同期を再試行
					</button>
				</>
			) : null}

			{status === "synced" && syncedCount > 0 ? (
				<p className={styles.message}>{syncedCount}件の在庫を反映しました</p>
			) : null}
		</section>
	);
}
